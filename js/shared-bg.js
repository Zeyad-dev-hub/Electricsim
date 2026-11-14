(function() {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let time = 0;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function drawBackground() {
        if (!reducedMotion) time += 0.004;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        const grid = 48;
        const major = grid * 5;
        const drift = reducedMotion ? 0 : (time * 18) % grid;

        ctx.save();
        ctx.translate(-drift, 0);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.012)";
        ctx.beginPath();
        for (let x = 0; x <= width + grid; x += grid) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += grid) {
            ctx.moveTo(0, y);
            ctx.lineTo(width + grid, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "rgba(61, 217, 255, 0.025)";
        ctx.beginPath();
        for (let x = 0; x <= width + major; x += major) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += major) {
            ctx.moveTo(0, y);
            ctx.lineTo(width + major, y);
        }
        ctx.stroke();
        ctx.restore();

        const centerX = width * 0.5;
        const centerY = height * 0.54;
        const maxR = Math.min(width, height) * 0.42;

        for (let i = 1; i <= 5; i++) {
            const r = maxR * (i / 5);
            ctx.strokeStyle = `rgba(139, 157, 255, ${(0.12 - i * 0.014) * 0.35})`;
            ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2 + 0.04; a += 0.04) {
                const wave = Math.sin(a * 3 + time + i) * 8 + Math.cos(a * 5 - time * 0.6) * 4;
                const x = centerX + Math.cos(a) * (r + wave);
                const y = centerY + Math.sin(a) * (r * 0.58 + wave);
                if (a === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        const beam = ctx.createLinearGradient(0, 0, width, height);
        beam.addColorStop(0, "rgba(61, 217, 255, 0)");
        beam.addColorStop(0.52, "rgba(61, 217, 255, 0.015)");
        beam.addColorStop(1, "rgba(61, 217, 255, 0)");
        ctx.fillStyle = beam;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < 34; i++) {
            const px = (Math.sin(time * 0.42 + i * 7.7) * 0.5 + 0.5) * width;
            const py = (Math.cos(time * 0.33 + i * 5.1) * 0.5 + 0.5) * height;
            const alpha = (0.14 + (i % 4) * 0.035) * 0.55;
            ctx.fillStyle = `rgba(244, 247, 251, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, i % 5 === 0 ? 1.7 : 1.05, 0, Math.PI * 2);
            ctx.fill();
        }

        const vignette = ctx.createRadialGradient(centerX, centerY, maxR * 0.2, centerX, centerY, Math.max(width, height) * 0.78);
        vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
        vignette.addColorStop(1, "rgba(0, 0, 0, 0.95)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        requestAnimationFrame(drawBackground);
    }

    window.addEventListener("resize", resize);
    resize();
    drawBackground();
})();
