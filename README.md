# blur-canvas
Basic framebuffer blur utility. Pass in a texture, get a blurred framebuffer back. Useful for one-off, static blurs but can also be used in a render loop.

Uses [glsl-fast-gaussian-blur](https://github.com/Jam3/glsl-fast-gaussian-blur) by jam3.

## Usage
```
// setup with options. make sure to pass in a shared renderer.
const blurCanvas = new BlurCanvas({ width, height, renderer });

// blur a texture
blurCanvas.blur(renderTarget.texture);

// use the result
mesh.material.uniforms.textureSmall.value = blurCanvas.getCurrentTexture();
```

## Roadmap
Some potential next steps:
- [ ] Decouple from threejs
- [ ] Add offscreen canvas example
- [ ] jsdoc and better comments
