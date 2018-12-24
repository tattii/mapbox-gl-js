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

	int k;	
    for (int i = 0; i < 128; i++){
		k = i;
        if (u_colors[i].a >= v) break;
    }

    gl_FragColor = vec4(u_colors[i].rgb, u_opacity);

#ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
#endif
}
