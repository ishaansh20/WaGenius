import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft, MessageSquare } from "lucide-react";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);

  /* ── Particle canvas background ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.4 + 0.08,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${p.alpha})`;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="nf-page">
      <canvas ref={canvasRef} className="nf-canvas" aria-hidden="true" />

      {/* Subtle radial glow */}
      <div className="nf-glow" aria-hidden="true" />

      <div className="nf-container">
        {/* Brand */}
        <motion.div
          className="nf-brand"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="nf-brand-icon">
            <MessageSquare size={18} />
          </div>
          <span>Wagenius</span>
        </motion.div>

        {/* Giant 404 */}
        <motion.div
          className="nf-code"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          aria-hidden="true"
        >
          404
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="nf-title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
        >
          Page not found
        </motion.h1>

        {/* Description */}
        <motion.p
          className="nf-desc"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
        >
          The URL{" "}
          <code className="nf-url">{location.pathname}</code>{" "}
          doesn't exist. It may have been moved, deleted, or you might have
          mistyped the address.
        </motion.p>

        {/* Actions */}
        <motion.div
          className="nf-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="nf-btn nf-btn-primary"
            onClick={() => navigate("/")}
          >
            <Home size={16} />
            Go to Dashboard
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="nf-btn nf-btn-secondary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Go back
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="nf-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          © {new Date().getFullYear()} Wagenius · WhatsApp Automation Platform
        </motion.p>
      </div>
    </div>
  );
}
