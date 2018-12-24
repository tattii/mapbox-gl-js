uniform sampler2D u_image;
varying vec2 v_pos;

uniform vec4 u_colors[128];
uniform int u_color_len;
uniform float u_opacity;

float getElevation(vec2 coord) {
    // Convert encoded elevation value to meters
    vec4 data = texture2D(u_image, coord) * 255.0;
    return (data.r + data.g * 256.0 + data.b * 256.0 * 256.0) - 65536.0;
}


void main() {
    float v = getElevation(v_pos);

    vec4 c = u_colors[2];
    gl_FragColor =  v > 100.0 ? vec4(0.0, 0.2, 0.0, u_opacity) : vec4(c.rgb, u_opacity);

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
