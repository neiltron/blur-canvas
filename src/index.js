import {
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Scene,
  OrthographicCamera,
  DoubleSide,
  Vector3,
} from 'three';
import DoubleBuffer from 'double-buffer';

export default class BlurCanvas {
  constructor(opts = {}) {
    const { width, height } = opts;

    this.renderer = opts.renderer;
    this.iterations = opts.iterations || 8;
    this.fbo = new DoubleBuffer({ width, height });

    this.scene = new Scene();
    this.camera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 2);
    this.camera.position.set(0, 0, 1);
    this.camera.lookAt(new Vector3());

    this.setupPlane();
  }

  blur(texture) {
    this.plane.material.uniforms.u_blur_amount.value = 0;
    this.plane.material.uniforms.u_source_texture.value = texture;
    this.plane.material.uniforms.u_image_dimensions.value = [
      texture.image.width,
      texture.image.height,
    ];
    this.plane.material.needsUpdate = true;

    this.render();
    this.plane.material.uniforms.u_blur_amount.value = 1;

    for (let i = 0; i < this.iterations; i += 1) {
      const radius = (this.iterations - i - 1);
      const even = i % 2 === 0;

      // even horizontal, odd vertical
      this.plane.material.uniforms.u_blur_direction.value = even ? [radius, 0] : [0, radius];
      this.render();
    }
  }

  setupPlane(width, height) {
    this.plane = new Mesh(
      new PlaneGeometry(width, height),
      this.createMaterial(),
    );


    this.scene.add(this.plane);
  }

  getCurrentTexture() {
    return this.fbo.read().texture
  }

  render() {
    // set render target to fbo write target and render
    this.renderer.setRenderTarget(this.fbo.write());
    this.renderer.render(this.scene, this.camera);

    // swap read/write buffers
    this.fbo.swap();

    // set sim material texture to freshly drawn target
    this.plane.material.uniforms.u_buffer_texture.value = this.fbo.read().texture;
  }

  createMaterial() {
    return new ShaderMaterial({
      transparent: true,
      side: DoubleSide,
      uniforms: {
        u_buffer_texture: { value: this.fbo.read().texture, type: 't' },
        u_source_texture: { value: null, type: 't' },
        u_blur_amount: { value: 0 },
        u_blur_direction: { value: [0, 0] },
        u_image_dimensions: { value: [0, 0] },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D u_source_texture;
        uniform sampler2D u_buffer_texture;
        uniform float u_blur_amount;
        uniform vec2 u_blur_direction;
        uniform vec2 u_image_dimensions;

        // from glsl-fast-gaussian-blur by jam3
        vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
          vec4 color = vec4(0.0);
          vec2 off1 = vec2(1.411764705882353) * direction;
          vec2 off2 = vec2(3.2941176470588234) * direction;
          vec2 off3 = vec2(5.176470588235294) * direction;

          color += texture2D(image, uv) * 0.1964825501511404;

          color += texture2D(image, uv + (off1 / resolution)) * 0.2969069646728344;
          color += texture2D(image, uv - (off1 / resolution)) * 0.2969069646728344;

          color += texture2D(image, uv + (off2 / resolution)) * 0.09447039785044732;
          color += texture2D(image, uv - (off2 / resolution)) * 0.09447039785044732;

          color += texture2D(image, uv + (off3 / resolution)) * 0.010381362401148057;
          color += texture2D(image, uv - (off3 / resolution)) * 0.010381362401148057;
          return color;
        }

        void main() {
          vec4 source_color = texture2D(u_source_texture, vUv);
          vec4 map = blur13(
            u_buffer_texture,
            vUv,
            u_image_dimensions,
            u_blur_direction
          );

          vec4 color = mix(source_color, map, u_blur_amount);

          gl_FragColor = color;
        }
      `,
    })
  }
}
