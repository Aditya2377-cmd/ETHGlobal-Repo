import React, { useEffect, useRef } from 'react';
import { VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE } from './shaders';

interface PerPayBackgroundProps {
  colorMode?: 'spectrum' | 'emerald' | 'codepen';
  paletteMode?: 'spectrum' | 'perpay' | 'codepen';
  fullScreen?: boolean;
  opacity?: number;
}

export const PerPayBackground: React.FC<PerPayBackgroundProps> = ({
  colorMode = 'spectrum',
  paletteMode,
  fullScreen = true,
  opacity = 1.0,
}) => {
  const activeColorMode = paletteMode === 'perpay' ? 'emerald' : colorMode;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    let gl: WebGL2RenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let vertexBuffer: WebGLBuffer | null = null;
    let indexBuffer: WebGLBuffer | null = null;
    let totalTime = 0;
    let lastTime = performance.now();
    let isTabHidden = false;

    try {
      gl = canvas.getContext('webgl2', {
        alpha: false,
        depth: true,
        antialias: false,
        powerPreference: 'high-performance',
      });

      if (!gl) {
        console.warn('WebGL 2 not supported by browser.');
        return;
      }

      gl.clearColor(0.975, 0.982, 0.992, 1.0);
      gl.enable(gl.DEPTH_TEST);

      vertexShader = gl.createShader(gl.VERTEX_SHADER);
      fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      if (!vertexShader || !fragmentShader) return;

      gl.shaderSource(vertexShader, VERTEX_SHADER_SOURCE.trim());
      gl.shaderSource(fragmentShader, FRAGMENT_SHADER_SOURCE.trim());

      gl.compileShader(vertexShader);
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('VS compile error:', gl.getShaderInfoLog(vertexShader));
        return;
      }

      gl.compileShader(fragmentShader);
      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('FS compile error:', gl.getShaderInfoLog(fragmentShader));
        return;
      }

      program = gl.createProgram();
      if (!program) return;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
      }

      gl.useProgram(program);

      // Full screen quad buffer
      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0]),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      // Index buffer
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([1, 0, 2, 3]),
        gl.STATIC_DRAW
      );

      const uResolution = gl.getUniformLocation(program, 'iResolution');
      const uTimeIndex = gl.getUniformLocation(program, 'iTime');
      const uColorModeLocation = gl.getUniformLocation(program, 'uColorMode');
      const uIsLightModeLocation = gl.getUniformLocation(program, 'uIsLightMode');

      const handleResize = () => {
        if (!canvas || !gl) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.floor(window.innerWidth * dpr);
        const h = Math.floor(window.innerHeight * dpr);

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      const render = (now: number) => {
        if (!gl || !program) return;

        const dt = (now - lastTime) / 1000.0;
        lastTime = now;

        if (!isTabHidden) {
          totalTime += dt;

          gl.useProgram(program);
          if (uTimeIndex) gl.uniform1f(uTimeIndex, totalTime);
          if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
          if (uColorModeLocation) {
            const modeInt = activeColorMode === 'emerald' ? 1 : (activeColorMode === 'codepen' ? 2 : 0);
            gl.uniform1i(uColorModeLocation, modeInt);
          }
          if (uIsLightModeLocation) {
            gl.uniform1i(uIsLightModeLocation, 1);
          }

          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);
        }

        animationFrameId = requestAnimationFrame(render);
      };

      animationFrameId = requestAnimationFrame(render);

      const handleVisibilityChange = () => {
        isTabHidden = document.visibilityState === 'hidden';
        if (!isTabHidden) {
          lastTime = performance.now();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);

        if (gl) {
          if (vertexBuffer) gl.deleteBuffer(vertexBuffer);
          if (indexBuffer) gl.deleteBuffer(indexBuffer);
          if (vertexShader) gl.deleteShader(vertexShader);
          if (fragmentShader) gl.deleteShader(fragmentShader);
          if (program) gl.deleteProgram(program);
        }
      };
    } catch (err) {
      console.error('WebGL init exception:', err);
    }
  }, [activeColorMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
      aria-hidden="true"
    />
  );
};
