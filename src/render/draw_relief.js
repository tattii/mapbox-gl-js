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

    context.setDepthMode(painter.depthModeForSublayer(0, DepthMode.ReadOnly));
    context.setStencilMode(StencilMode.disabled);
    context.setColorMode(painter.colorModeForRenderPass());

    for (const tileID of tileIDs) {
        const tile = sourceCache.getTile(tileID);
        renderRelief(painter, tile, layer);
    }

    context.viewport.set([0, 0, painter.width, painter.height]);
}


function renderRelief(painter, tile, layer) {
    const context = painter.context;
    const gl = context.gl;

    if (tile.dem && tile.dem.level) {
        const tileSize = tile.dem.level.dim;

        const pixelData = tile.dem.getPixels();
        context.activeTexture.set(gl.TEXTURE1);

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

        context.activeTexture.set(gl.TEXTURE0);

        let fbo = tile.fbo;

        if (!fbo) {
            const renderTexture = new Texture(context, {width: tileSize, height: tileSize, data: null}, gl.RGBA);
            renderTexture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE);

            fbo = tile.fbo = context.createFramebuffer(tileSize, tileSize);
            fbo.colorAttachment.set(renderTexture.texture);
        }

        context.bindFramebuffer.set(fbo.framebuffer);
        context.viewport.set([0, 0, tileSize, tileSize]);

        const matrix = mat4.create();
        // Flip rendering at y axis.
        mat4.ortho(matrix, 0, EXTENT, -EXTENT, 0, 0, 1);
        mat4.translate(matrix, matrix, [0, -EXTENT, 0]);


        // ----------------
        const program = painter.useProgram('relief');
        const posMatrix = painter.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), true);

        gl.uniformMatrix4fv(program.uniforms.u_matrix, false, posMatrix);
        gl.uniform1i(program.uniforms.u_image, 1);

        const shadowColor = layer.paint.get("hillshade-shadow-color");
        gl.uniform4f(program.uniforms.u_shadow, shadowColor.r, shadowColor.g, shadowColor.b, shadowColor.a);

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


