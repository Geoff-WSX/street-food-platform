import { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '../store/theme';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

interface GridPoint {
  x: number;
  y: number;
  opacity: number;
}

const AdminBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const { mode } = useThemeStore();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const gridPointsRef = useRef<GridPoint[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  // 初始化粒子
  const initParticles = (width: number, height: number) => {
    const particles: Particle[] = [];
    const particleCount = Math.min(80, Math.floor((width * height) / 15000));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    particlesRef.current = particles;
  };

  // 初始化网格点
  const initGridPoints = (width: number, height: number) => {
    const points: GridPoint[] = [];
    const gridSize = 60;

    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        points.push({
          x,
          y,
          opacity: Math.random() * 0.1 + 0.05,
        });
      }
    }

    gridPointsRef.current = points;
  };

  // 绘制背景
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const isDark = mode === 'dark';

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (isDark) {
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(0.5, '#1a1f3a');
      gradient.addColorStop(1, '#0f172a');
    } else {
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(0.5, '#f1f5f9');
      gradient.addColorStop(1, '#e2e8f0');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制六边形网格
    const hexSize = 40;
    const hexHeight = hexSize * Math.sqrt(3);
    const hexWidth = hexSize * 2;
    const horizDist = hexWidth * 0.75;
    const vertDist = hexHeight;

    ctx.strokeStyle = isDark ? 'rgba(100, 116, 139, 0.1)' : 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;

    for (let row = -1; row < height / vertDist + 1; row++) {
      for (let col = -1; col < width / horizDist + 1; col++) {
        const x = col * horizDist;
        const y = row * vertDist + (col % 2 === 0 ? 0 : vertDist / 2);

        // 计算与鼠标的距离，产生交互效果
        const dx = x - mouseRef.current.x;
        const dy = y - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 200;
        const interactionEffect = Math.max(0, 1 - distance / maxDistance);

        // 绘制六边形
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = x + hexSize * Math.cos(angle);
          const hy = y + hexSize * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(hx, hy);
          } else {
            ctx.lineTo(hx, hy);
          }
        }
        ctx.closePath();

        // 根据交互效果调整透明度
        const baseOpacity = isDark ? 0.05 : 0.08;
        const hoverOpacity = interactionEffect * (isDark ? 0.15 : 0.12);
        ctx.globalAlpha = baseOpacity + hoverOpacity;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // 绘制连接线
    ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 0.5;

    particlesRef.current.forEach((particle, i) => {
      // 更新粒子位置
      particle.x += particle.vx;
      particle.y += particle.vy;

      // 边界检查
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;

      // 鼠标交互
      const dx = particle.x - mouseRef.current.x;
      const dy = particle.y - mouseRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 150) {
        const force = (150 - distance) / 150;
        particle.vx += (dx / distance) * force * 0.02;
        particle.vy += (dy / distance) * force * 0.02;
      }

      // 速度限制
      const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
      if (speed > 1) {
        particle.vx = (particle.vx / speed) * 1;
        particle.vy = (particle.vy / speed) * 1;
      }

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(99, 102, 241, ${particle.opacity})`
        : `rgba(99, 102, 241, ${particle.opacity * 0.8})`;
      ctx.fill();

      // 绘制连接线
      particlesRef.current.slice(i + 1).forEach((otherParticle) => {
        const dx = particle.x - otherParticle.x;
        const dy = particle.y - otherParticle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(otherParticle.x, otherParticle.y);
          ctx.strokeStyle = isDark
            ? `rgba(99, 102, 241, ${(1 - dist / 120) * 0.15})`
            : `rgba(99, 102, 241, ${(1 - dist / 120) * 0.2})`;
          ctx.stroke();
        }
      });
    });

    // 绘制网格点
    gridPointsRef.current.forEach((point) => {
      const time = Date.now() * 0.001;
      const opacity = point.opacity + Math.sin(time + point.x * 0.01) * 0.03;

      ctx.beginPath();
      ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(148, 163, 184, ${Math.max(0, opacity)})`
        : `rgba(100, 116, 139, ${Math.max(0, opacity * 0.8)})`;
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(draw);
  };

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setDimensions({ width, height });

      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        initParticles(width, height);
        initGridPoints(width, height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // 启动动画
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default AdminBackground;
