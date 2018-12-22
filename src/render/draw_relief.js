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
    const sourceMaxZoom = sourceCache.getSource().maxzoom;

    context.setDepthMode(painter.depthModeForSublayer(0, DepthMode.ReadOnly));
    context.setStencilMode(StencilMode.disabled);
    context.setColorMode(painter.colorModeForRenderPass());

    for (const tileID of tileIDs) {
        const tile = sourceCache.getTile(tileID);
        renderRelief(painter, tile, layer);
    }

    context.viewport.set([0, 0, painter.width, painter.height]);
}


function getTileLatRange(painter, tileID: OverscaledTileID) {
    const coordinate0 = tileID.toCoordinate();
    const coordinate1 = new Coordinate(coordinate0.column, coordinate0.row + 1, coordinate0.zoom);
    return [painter.transform.coordinateLocation(coordinate0).lat, painter.transform.coordinateLocation(coordinate1).lat];
}

function renderRelief(painter, tile, layer) {
    const context = painter.context;
    const gl = context.gl;
    const fbo = tile.fbo;
    if (!fbo) return;

    const program = painter.useProgram('relief');
    const posMatrix = painter.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), true);
    context.activeTexture.set(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, fbo.colorAttachment.get());

    gl.uniformMatrix4fv(program.uniforms.u_matrix, false, posMatrix);
    gl.uniform1i(program.uniforms.u_image, 0);

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


