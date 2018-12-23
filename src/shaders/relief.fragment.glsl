uniform sampler2D u_image;
varying vec2 v_pos;

uniform vec4 u_shadow;

float getElevation(vec2 coord) {
    // Convert encoded elevation value to meters
    vec4 data = texture2D(u_image, coord) * 255.0;
    return (data.r + data.g * 256.0 + data.b * 256.0 * 256.0) - 65536.0;
}


void main() {
	float v = getElevation(v_pos);

    gl_FragColor =  v > 100.0 ? u_shadow : vec4(1.0, 1.0, 1.0, 1.0);

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
