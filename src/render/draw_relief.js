// @flow
const Coordinate = require('../geo/coordinate');
const Texture = require('./texture');
const EXTENT = require('../data/extent');
const mat4 = require('@mapbox/gl-matrix').mat4;
const StencilMode = require('../gl/stencil_mode');
const DepthMode = require('../gl/depth_mode');

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

    context.setStencilMode(StencilMode.disabled);
    context.setColorMode(painter.colorModeForRenderPass());

    // Constant parameters.
    gl.uniform1i(program.uniforms.u_image, 0);
    gl.uniform1f(program.uniforms.u_opacity, 0.7);
    const shadowColor = layer.paint.get("hillshade-shadow-color");
    gl.uniform4f(program.uniforms.u_shadow, shadowColor.r, shadowColor.g, shadowColor.b, shadowColor.a);


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


