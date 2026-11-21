(function (root) {
    'use strict';

    const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const CHUNK_KEYWORD = 'ElectricsimData';
    const LAB_NAMES = {
        'dc-circuit': 'Circuits Lab',
        logic: 'Logic Lab'
    };

    // Precompute standard IEEE 802.3 CRC-32 lookup table for valid PNG chunks
    const CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        CRC_TABLE[n] = c >>> 0;
    }

    function crc32(bytes) {
        let c = 0xffffffff;
        for (let i = 0; i < bytes.length; i++) {
            c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
        }
        return (c ^ 0xffffffff) >>> 0;
    }

    function encodeUtf8(str) {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(str);
        }
        if (typeof Buffer !== 'undefined') {
            return new Uint8Array(Buffer.from(str, 'utf8'));
        }
        const utf8 = unescape(encodeURIComponent(str));
        const out = new Uint8Array(utf8.length);
        for (let i = 0; i < utf8.length; i++) out[i] = utf8.charCodeAt(i);
        return out;
    }

    function decodeUtf8(bytes) {
        if (typeof TextDecoder !== 'undefined') {
            return new TextDecoder('utf-8').decode(bytes);
        }
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes).toString('utf8');
        }
        let s = '';
        for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
        return decodeURIComponent(escape(s));
    }

    function readUint32BE(bytes, offset) {
        return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
    }

    function writeUint32BE(bytes, offset, value) {
        bytes[offset] = (value >>> 24) & 0xff;
        bytes[offset + 1] = (value >>> 16) & 0xff;
        bytes[offset + 2] = (value >>> 8) & 0xff;
        bytes[offset + 3] = value & 0xff;
    }

    function isPngBytes(bytes) {
        if (!bytes || bytes.length < 8) return false;
        for (let i = 0; i < 8; i++) {
            if (bytes[i] !== PNG_SIGNATURE[i]) return false;
        }
        return true;
    }

    function buildITXtChunk(keyword, text) {
        const kwBytes = encodeUtf8(keyword);
        const textBytes = encodeUtf8(text);
        // iTXt data layout: keyword \0 compressionFlag(0) compressionMethod(0) languageTag("") \0 translatedKeyword("") \0 text(UTF-8)
        const dataLen = kwBytes.length + 5 + textBytes.length;
        const chunk = new Uint8Array(12 + dataLen);
        writeUint32BE(chunk, 0, dataLen);
        // Chunk type: "iTXt"
        chunk[4] = 0x69; chunk[5] = 0x54; chunk[6] = 0x58; chunk[7] = 0x74;
        chunk.set(kwBytes, 8);
        let pos = 8 + kwBytes.length;
        chunk[pos++] = 0; // null separator after keyword
        chunk[pos++] = 0; // compression flag = 0 (uncompressed)
        chunk[pos++] = 0; // compression method = 0
        chunk[pos++] = 0; // empty language tag + null
        chunk[pos++] = 0; // empty translated keyword + null
        chunk.set(textBytes, pos);
        const crc = crc32(chunk.subarray(4, 8 + dataLen));
        writeUint32BE(chunk, 8 + dataLen, crc);
        return chunk;
    }

    /**
     * Embeds UTF-8 JSON inside a valid PNG iTXt chunk right before IEND.
     */
    function embedJsonInPng(pngInput, jsonText) {
        const pngBytes = pngInput instanceof Uint8Array ? pngInput : new Uint8Array(pngInput);
        if (!isPngBytes(pngBytes)) {
            throw new Error('Invalid PNG binary header.');
        }
        let offset = 8;
        let iendOffset = -1;
        while (offset + 12 <= pngBytes.length) {
            const length = readUint32BE(pngBytes, offset);
            const type = String.fromCharCode(
                pngBytes[offset + 4],
                pngBytes[offset + 5],
                pngBytes[offset + 6],
                pngBytes[offset + 7]
            );
            if (type === 'IEND') {
                iendOffset = offset;
                break;
            }
            offset += 12 + length;
        }
        if (iendOffset < 0) {
            throw new Error('PNG stream missing IEND chunk.');
        }
        const metaChunk = buildITXtChunk(CHUNK_KEYWORD, jsonText);
        const result = new Uint8Array(pngBytes.length + metaChunk.length);
        result.set(pngBytes.subarray(0, iendOffset), 0);
        result.set(metaChunk, iendOffset);
        result.set(pngBytes.subarray(iendOffset), iendOffset + metaChunk.length);
        return result;
    }

    /**
     * Extracts embedded Electricsim JSON from a PNG iTXt/tEXt chunk, or returns null.
     */
    function extractJsonFromPng(pngInput) {
        const pngBytes = pngInput instanceof Uint8Array ? pngInput : new Uint8Array(pngInput);
        if (!isPngBytes(pngBytes)) return null;
        let offset = 8;
        while (offset + 12 <= pngBytes.length) {
            const length = readUint32BE(pngBytes, offset);
            const type = String.fromCharCode(
                pngBytes[offset + 4],
                pngBytes[offset + 5],
                pngBytes[offset + 6],
                pngBytes[offset + 7]
            );
            const dataStart = offset + 8;
            const dataEnd = dataStart + length;
            if (dataEnd + 4 > pngBytes.length) break;

            if (type === 'iTXt' || type === 'tEXt') {
                let nul = dataStart;
                while (nul < dataEnd && pngBytes[nul] !== 0) nul++;
                const kw = decodeUtf8(pngBytes.subarray(dataStart, nul));
                if (kw === CHUNK_KEYWORD) {
                    if (type === 'tEXt') {
                        return decodeUtf8(pngBytes.subarray(nul + 1, dataEnd));
                    }
                    // iTXt: keyword \0 compFlag(1) compMethod(1) langTag \0 transKw \0 text
                    const compFlag = pngBytes[nul + 1];
                    if (compFlag === 0) {
                        let p = nul + 3;
                        while (p < dataEnd && pngBytes[p] !== 0) p++; // skip language tag
                        p++;
                        while (p < dataEnd && pngBytes[p] !== 0) p++; // skip translated keyword
                        p++;
                        if (p <= dataEnd) {
                            return decodeUtf8(pngBytes.subarray(p, dataEnd));
                        }
                    }
                }
            }
            if (type === 'IEND') break;
            offset = dataEnd + 4;
        }
        return null;
    }

    function formatTimestamp(date = new Date()) {
        const pad = n => String(n).padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    }

    function serializeSavedFile(lab, doc, name = '') {
        const payload = {
            app: 'Electricsim',
            lab,
            formatVersion: 1,
            savedAt: new Date().toISOString(),
            name: name || `${lab}-${formatTimestamp()}`,
            document: doc
        };
        return JSON.stringify(payload, null, 2);
    }

    function parseSavedJson(rawText, expectedLab, validateFn) {
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (err) {
            return { ok: false, error: 'Could not read file: invalid JSON syntax.' };
        }
        if (!parsed || typeof parsed !== 'object') {
            return { ok: false, error: 'Invalid saved file: expected a JSON object.' };
        }

        let doc = null;
        let meta = { name: '', savedAt: null, lab: expectedLab };

        if (parsed.app === 'Electricsim' && parsed.document && typeof parsed.document === 'object') {
            if (parsed.lab && parsed.lab !== expectedLab) {
                const srcLab = LAB_NAMES[parsed.lab] || parsed.lab;
                const dstLab = LAB_NAMES[expectedLab] || expectedLab;
                return {
                    ok: false,
                    error: `This file was saved from ${srcLab}, not ${dstLab}. Open ${srcLab} and drop it there.`
                };
            }
            doc = parsed.document;
            meta = {
                name: typeof parsed.name === 'string' ? parsed.name : '',
                savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
                lab: parsed.lab || expectedLab
            };
        } else if (parsed.schemaVersion === 1) {
            // Allow importing bare raw document JSON directly
            if (expectedLab === 'dc-circuit' && Array.isArray(parsed.gates) && !Array.isArray(parsed.components)) {
                return {
                    ok: false,
                    error: 'This file is a Logic Lab schematic. Open Logic Lab and drop it there.'
                };
            }
            if (expectedLab === 'logic' && Array.isArray(parsed.components) && !Array.isArray(parsed.gates)) {
                return {
                    ok: false,
                    error: 'This file is a Circuits Lab schematic. Open Circuits Lab and drop it there.'
                };
            }
            doc = parsed;
        } else {
            return {
                ok: false,
                error: 'Unrecognized file format. Drop an Electricsim saved .json file or B&W schematic .png.'
            };
        }

        if (typeof validateFn === 'function') {
            const errors = validateFn(doc);
            if (Array.isArray(errors) && errors.length > 0) {
                return { ok: false, error: `Saved file failed validation: ${errors[0]}` };
            }
        }

        return { ok: true, doc, meta };
    }

    async function readImportedFile(file, expectedLab, validateFn) {
        if (!file) return { ok: false, error: 'No file selected.' };
        const nameLower = String(file.name || '').toLowerCase();
        const isPngByType = file.type === 'image/png' || nameLower.endsWith('.png');

        try {
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            if (isPngByType || isPngBytes(bytes)) {
                const embedded = extractJsonFromPng(bytes);
                if (!embedded) {
                    return {
                        ok: false,
                        error: 'This PNG does not contain saved Electricsim schematic data. Drop a saved .json file or an Electricsim B&W schematic .png.'
                    };
                }
                const res = parseSavedJson(embedded, expectedLab, validateFn);
                if (res.ok) {
                    res.meta.sourceFilename = file.name || '';
                    res.meta.sourceKind = 'png';
                }
                return res;
            }
            const text = decodeUtf8(bytes);
            const res = parseSavedJson(text, expectedLab, validateFn);
            if (res.ok) {
                res.meta.sourceFilename = file.name || '';
                res.meta.sourceKind = 'json';
            }
            return res;
        } catch (err) {
            return { ok: false, error: `Could not read "${file.name || 'file'}": ${err.message}` };
        }
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            a.remove();
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function downloadSavedJson(lab, doc, baseName) {
        const stem = baseName || `electricsim-${lab === 'dc-circuit' ? 'circuit' : 'logic'}-${formatTimestamp()}`;
        const ext = lab === 'dc-circuit' ? '.circuit.json' : '.logic.json';
        const filename = stem.endsWith('.json') ? stem : `${stem}${ext}`;
        const text = serializeSavedFile(lab, doc, stem);
        const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        triggerDownload(blob, filename);
        return filename;
    }

    function canvasToPngBytes(canvas) {
        return new Promise((resolve, reject) => {
            if (typeof canvas.toBlob === 'function') {
                canvas.toBlob(blob => {
                    if (!blob) {
                        reject(new Error('Failed to encode schematic image.'));
                        return;
                    }
                    blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)), reject);
                }, 'image/png');
            } else {
                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    const base64 = dataUrl.split(',')[1];
                    const bin = atob(base64);
                    const arr = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                    resolve(arr);
                } catch (err) {
                    reject(err);
                }
            }
        });
    }

    async function downloadBWImage(canvas, lab, doc, baseName) {
        const stem = baseName || `electricsim-${lab === 'dc-circuit' ? 'circuit' : 'logic'}-bw-${formatTimestamp()}`;
        const filename = stem.endsWith('.png') ? stem : `${stem}.png`;
        const rawPng = await canvasToPngBytes(canvas);
        const jsonText = serializeSavedFile(lab, doc, stem);
        const enrichedPng = embedJsonInPng(rawPng, jsonText);
        const blob = new Blob([enrichedPng], { type: 'image/png' });
        triggerDownload(blob, filename);
        return filename;
    }

    function attachDropZone({ expectedLab, labTitle, validateFn, onLoad, onError }) {
        if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};

        const overlay = document.createElement('div');
        overlay.className = 'esim-drop-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.hidden = true;
        overlay.innerHTML =
            '<div class="esim-drop-card">' +
                '<div class="esim-drop-icon" aria-hidden="true">📂</div>' +
                `<div class="esim-drop-title">Drop to Load into ${labTitle || LAB_NAMES[expectedLab] || 'Electricsim'}</div>` +
                '<div class="esim-drop-sub">Accepts saved <code>.json</code> files &amp; Electricsim B&amp;W <code>.png</code> schematics</div>' +
            '</div>';
        document.body.appendChild(overlay);

        let dragDepth = 0;
        const hasFiles = e => {
            const types = e.dataTransfer && e.dataTransfer.types;
            if (!types) return false;
            return Array.from(types).includes('Files');
        };

        const show = () => {
            overlay.hidden = false;
            overlay.setAttribute('aria-hidden', 'false');
        };
        const hide = () => {
            dragDepth = 0;
            overlay.hidden = true;
            overlay.setAttribute('aria-hidden', 'true');
        };

        const onDragEnter = e => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepth++;
            show();
        };
        const onDragOver = e => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
            show();
        };
        const onDragLeave = e => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepth = Math.max(0, dragDepth - 1);
            if (dragDepth === 0) hide();
        };
        const onDrop = async e => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            hide();
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (!file) return;
            const res = await readImportedFile(file, expectedLab, validateFn);
            if (res.ok) {
                if (typeof onLoad === 'function') onLoad(res.doc, res.meta);
            } else if (typeof onError === 'function') {
                onError(res.error);
            }
        };

        window.addEventListener('dragenter', onDragEnter);
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('dragleave', onDragLeave);
        window.addEventListener('drop', onDrop);
        window.addEventListener('blur', hide);

        return () => {
            window.removeEventListener('dragenter', onDragEnter);
            window.removeEventListener('dragover', onDragOver);
            window.removeEventListener('dragleave', onDragLeave);
            window.removeEventListener('drop', onDrop);
            window.removeEventListener('blur', hide);
            overlay.remove();
        };
    }

    const ElectricsimIO = {
        CHUNK_KEYWORD,
        crc32,
        isPngBytes,
        embedJsonInPng,
        extractJsonFromPng,
        formatTimestamp,
        serializeSavedFile,
        parseSavedJson,
        readImportedFile,
        downloadSavedJson,
        downloadBWImage,
        attachDropZone
    };

    root.ElectricsimIO = ElectricsimIO;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ElectricsimIO;
    }
})(typeof window !== 'undefined' ? window : globalThis);
