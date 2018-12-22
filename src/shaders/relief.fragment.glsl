uniform sampler2D u_image;
varying vec2 v_pos;

uniform vec2 u_latrange;
uniform vec2 u_light;
uniform vec4 u_shadow;
uniform vec4 u_highlight;
uniform vec4 u_accent;

#define PI 3.141592653589793

void main() {
    vec4 pixel = texture2D(u_image, v_pos);

    gl_FragColor = u_shadow;

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
