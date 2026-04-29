// lib/analytics.ts

/**
 * Safely extract the user's specific Graphics Card (GPU) name via a hidden WebGL context
 * to append to PostHog event properties.
 * Example return: "Apple M2 Max" or "NVIDIA GeForce RTX 4090"
 */
export function getGPUInfo(): string {
    if (typeof window === 'undefined') return 'Server';

    try {
        const canvas = document.createElement('canvas');
        // Request a webgl context
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'WebGL Not Supported';

        // Some browsers prevent this string from being accessed unless the debug extension is enabled
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return 'GPU Debug Info Hidden';

        // Return the unmasked string the driver reports
        const gpuString = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return gpuString ? String(gpuString) : 'Unknown GPU';
    } catch (e) {
        console.error('Failed to get GPU info:', e);
        return 'Error extracting GPU';
    }
}
