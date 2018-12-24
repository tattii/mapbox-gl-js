// @flow
const Coordinate = require('../geo/coordinate');
const Texture = require('./texture');
const EXTENT = require('../data/extent');
const mat4 = require('@mapbox/gl-matrix').mat4;
const StencilMode = require('../gl/stencil_mode');
const DepthMode = require('../gl/depth_mode');
const {RGBAImage} = require('../util/image');

import type Painter from './painter';
import type SourceCache from '../source/source_cache';
import type HillshadeStyleLayer from '../style/style_layer/hillshade_style_layer';
import type {OverscaledTileID} from '../source/tile_id';

module.exports = drawRelief;

function drawRelief(painter: Painter, sourceCache: SourceCache, layer: HillshadeStyleLayer, tileIDs: Array<OverscaledTileID>) {
    if (painter.renderPass !== 'translucent') return;

    const context = painter.context;
    const gl = context.gl;
    const program = painter.useProgram('relief');

    context.setDepthMode(painter.depthModeForSublayer(0, DepthMode.ReadOnly));
    context.setStencilMode(StencilMode.disabled);
    context.setColorMode(painter.colorModeForRenderPass());

    // Constant parameters.
    gl.uniform1i(program.uniforms.u_image, 0);
    gl.uniform1f(program.uniforms.u_opacity, 0.7);
    setReliefColor(context, gl, program, layer);


    for (const tileID of tileIDs) {
        const tile = sourceCache.getTile(tileID);

        if (tile.dem && tile.dem.level) {
            // dem texture
            const tileSize = tile.dem.level.dim;
            const pixelData = tile.dem.getPixels();
            context.activeTexture.set(gl.TEXTURE0);

            context.pixelStoreUnpackPremultiplyAlpha.set(false);
            tile.demTexture = tile.demTexture || painter.getTileTexture(tile.tileSize);
            if (tile.demTexture) {
                const demTexture = tile.demTexture;
                demTexture.update(pixelData, false);
                demTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
            } else {
                tile.demTexture = new Texture(context, pixelData, gl.RGBA, false);
                tile.demTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
            }

            // relief paint
            const posMatrix = painter.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), true);
            gl.uniformMatrix4fv(program.uniforms.u_matrix, false, posMatrix);

            if (tile.maskedBoundsBuffer && tile.maskedIndexBuffer && tile.segments) {
                program.draw(
                    context,
                    gl.TRIANGLES,
                    layer.id,
                    tile.maskedBoundsBuffer,
                    tile.maskedIndexBuffer,
                    tile.segments
                );
            } else {
                const buffer = painter.rasterBoundsBuffer;
                const vao = painter.rasterBoundsVAO;
                vao.bind(context, program, buffer, []);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffer.length);
            }
        }
    }
}


function setReliefColor(context, gl, program, layer) {
    // const colors = layer.paint.get("relief-colors");
    const colors = [
        [0, [50, 180, 50]],
        [10, [240, 250, 150]],
        [30, [190, 185, 135]],
        [60, [235, 220, 175]],
        [100, [0, 100, 0]],
        [500, [0, 0, 100]],
        [1500, [0, 0, 200]]
    ];

    const len = colors.length;
    const color_table = new Uint8Array(4 * len * 2);
    const elevation_table = new Uint32Array(len);

    for (let i = 0; i < len; i++){
        elevation_table[i] = colors[i][0] + 65536;

        color_table[4*i    ] = colors[i][1][0];
        color_table[4*i + 1] = colors[i][1][1];
        color_table[4*i + 2] = colors[i][1][2];
    }
    color_table.set(new Uint8Array(elevation_table.buffer), 4 * len);

    context.activeTexture.set(gl.TEXTURE1);
    context.pixelStoreUnpackPremultiplyAlpha.set(false);
    const image = new RGBAImage({width: len, height: 2}, color_table);
    const texture = new Texture(context, image, gl.RGBA, false);
    texture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);

    gl.uniform1i(program.uniforms.u_table, 1);
    gl.uniform1f(program.uniforms.u_color_len, len);
}


