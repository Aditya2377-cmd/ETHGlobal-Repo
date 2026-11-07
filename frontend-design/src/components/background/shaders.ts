/**
 * GLSL Shaders for Payper WebGL 2 Background
 * Multi-layer procedural universe with rich dynamic colors
 * Derived from kakaxi0618 CodePen mathematics (MIT License - see THIRD_PARTY_NOTICES.md)
 * Enhanced with Crisp White & Luminous Fintech Theme support
 */

export const VERTEX_SHADER_SOURCE = `#version 300 es
layout (location = 0) in vec2 point;
void main() {
    gl_Position = vec4(point.x, point.y, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform int uColorMode; // 0 = Multi-Color Layer Spectrum, 1 = Emerald/Copper, 2 = Original CodePen Monochromatic
uniform int uIsLightMode; // 1 = Crisp White Luminous Fintech, 0 = Dark Void

out vec4 fragColor;

float N21(vec2 p) {
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
}

vec2 N22(vec2 p) {
    float n = N21(p);
    return vec2(n, N21(p + n));
}

vec2 getPos(vec2 id, vec2 offset, float iTime) {
    vec2 n = N22(id + offset);
    float x = cos(iTime * n.x);
    float y = sin(iTime * n.y);
    return vec2(x, y) * 0.4 + offset;
}

float distanceToLine(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - t * ba);
}

float getLine(vec2 p, vec2 a, vec2 b, vec2 iResolution) {
    float distance = distanceToLine(p, a, b);
    float dx = 15.0 / iResolution.y;
    return smoothstep(dx, 0.0, distance) * smoothstep(1.2, 0.3, length(a - b));
}

float layer(vec2 st, float iTime, vec2 iResolution) {
    float m = 0.0;
    vec2 gv = fract(st) - 0.5;
    vec2 id = floor(st);

    vec2 p[9];
    int idx = 0;
    for (float x = -1.0; x <= 1.0; x += 1.0) {
        for (float y = -1.0; y <= 1.0; y += 1.0) {
            p[idx] = getPos(id, vec2(x, y), iTime);
            idx++;
        }
    }

    for (int j = 0; j <= 8; j++) {
        m += getLine(gv, p[4], p[j], iResolution);
        vec2 temp = (gv - p[j]) * 20.0;
        // Node pulses with sin wave
        m += (1.0 / max(0.0001, dot(temp, temp))) * (sin(10.0 * iTime + fract(p[j].x) * 20.0) * 0.5 + 0.5);
    }

    m += getLine(gv, p[1], p[3], iResolution);
    m += getLine(gv, p[1], p[5], iResolution);
    m += getLine(gv, p[3], p[7], iResolution);
    m += getLine(gv, p[5], p[7], iResolution);

    return m;
}

void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float theta = iTime * 0.08;
    mat2 rot = mat2(cos(theta), -sin(theta), sin(theta), cos(theta));
    vec2 gradient = uv;
    uv = rot * uv;

    vec3 col = vec3(0.0);
    float totalM = 0.0;

    // Loop through 4 depth layers
    for (float i = 0.0; i < 1.0; i += 0.25) {
        float depth = fract(i + iTime * 0.1);
        float l = layer(uv * mix(10.0, 0.5, depth) + i * 20.0, iTime, iResolution) 
                 * smoothstep(0.0, 0.2, depth) 
                 * smoothstep(1.0, 0.8, depth);

        totalM += l;

        if (uColorMode == 1) {
            // Emerald, Royal Blue, and Warm Amber
            float tFactor = sin(iTime * 0.15 + depth * 3.14) * 0.5 + 0.5;
            vec3 royalBlue = vec3(0.14, 0.38, 0.92);
            vec3 emerald   = vec3(0.05, 0.65, 0.42);
            vec3 amber     = vec3(0.85, 0.52, 0.15);

            vec3 layerColor = mix(royalBlue, emerald, tFactor);
            layerColor = mix(layerColor, amber, smoothstep(1.2, 2.8, l) * 0.4);

            col += (l - gradient.y * 0.15 * l) * layerColor;
        } else if (uColorMode == 2) {
            // Original CodePen Single-Tone Spectrum
            vec3 baseColor = sin(vec3(3.45, 6.56, 8.78) * iTime * 0.2) * 0.5 + 0.5;
            col += (l - gradient.y * 0.2 * l) * baseColor;
        } else {
            // Multi-Color Dynamic Spectrum: Distinct vibrant harmonic colors
            vec3 layerColor = sin(vec3(3.45, 6.56, 8.78) * (iTime * 0.22 + depth * 1.8) + i * 2.1) * 0.5 + 0.5;
            
            // Vibrant accents on high intensity nodes
            layerColor = mix(layerColor, vec3(0.20, 0.50, 1.0), smoothstep(1.0, 2.5, l) * 0.45);
            layerColor = mix(layerColor, vec3(0.95, 0.60, 0.20), smoothstep(2.5, 4.5, l) * 0.4);

            col += (l - gradient.y * 0.12 * l) * layerColor;
        }
    }

    if (uIsLightMode == 1) {
        // Ultra-crisp bright white luminous canvas
        // The cosmic lines and universe nodes glow in vivid saturated colors against clean white
        vec3 bg = vec3(0.975, 0.982, 0.992);
        vec3 finalCol = mix(bg, col * 1.35, clamp(totalM * 0.35, 0.0, 0.88));
        fragColor = vec4(finalCol, 1.0);
    } else {
        fragColor = vec4(col, 1.0);
    }
}
`;
