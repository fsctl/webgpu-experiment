# webgpu compute shader experiment

This is a demonstration WebGPU compute shader.  It computes the value of pi using a Monte Carlo approach.  It's an unremarkable program that was written just to experiment with WebGPU.

## How to run

Regular browsers don't support WebGPU at the time of this writing, so first install [Chrome Canary](https://www.google.com/chrome/canary/).

Enable "Unsafe WebGPU" in [chrome://flags/#enable-unsafe-webgpu](chrome://flags/#enable-unsafe-webgpu).  Verify WebGPU is working using an examples site like [this one](https://austin-eng.com/webgpu-samples/samples/animometer).

Clone this repo and open index.html.  You should get some approximation of pi ~= 3.14.

## Further Reading / Refs

Heavily based on this tutorial:  [https://web.dev/gpu-compute/](https://web.dev/gpu-compute/)

[WebGPU standard](https://gpuweb.github.io/gpuweb/explainer/)

[WebGPU Shader Language standard](https://www.w3.org/TR/WGSL/)
