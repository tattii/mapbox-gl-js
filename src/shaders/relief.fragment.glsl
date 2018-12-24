uniform sampler2D u_image;
uniform sampler2D u_table;
varying vec2 v_pos;

uniform float u_color_len;
uniform float u_opacity;

float getElevation(sampler2D u_tex, vec2 coord, float bias) {
    // Convert encoded elevation value to meters
    vec4 data = texture2D(u_tex, coord) * 255.0;
    return (data.r + data.g * 256.0 + data.b * 256.0 * 256.0);
}

float getIndex(float v) {
    for (float i = 0.0; i < 128.0; i++){
		if (i >= u_color_len) return u_color_len - 1.0;
		if (getElevation(u_table, vec2(i / u_color_len, 1), 0.0) >= v) return i;
    }
}

void main() {
    float v = getElevation(u_image, v_pos, 0.0);
	float i = getIndex(v);

	vec4 color = texture2D(u_table, vec2(i / u_color_len, 0), 0.0);
    gl_FragColor = vec4(color.rgb, u_opacity);

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
