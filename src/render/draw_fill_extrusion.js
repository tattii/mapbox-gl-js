// @flow

const Texture = require('./texture');
const Color = require('../style-spec/util/color');
const DepthMode = require('../gl/depth_mode');
const StencilMode = require('../gl/stencil_mode');
const {
    fillExtrusionUniformValues,
    fillExtrusionPatternUniformValues,
    extrusionTextureUniformValues
} = require('./program/fill_extrusion_program');

import type Painter from './painter';
import type SourceCache from '../source/source_cache';
import type FillExtrusionStyleLayer from '../style/style_layer/fill_extrusion_style_layer';
import type FillExtrusionBucket from '../data/bucket/fill_extrusion_bucket';
import type {OverscaledTileID} from '../source/tile_id';

module.exports = draw;

function draw(painter: Painter, source: SourceCache, layer: FillExtrusionStyleLayer, coords: Array<OverscaledTileID>) {
    if (layer.paint.get('fill-extrusion-opacity') === 0) {
        return;
    }

    if (painter.renderPass === 'offscreen') {
        drawToExtrusionFramebuffer(painter, layer);

        for (const coord of coords) {
            const tile = source.getTile(coord);
            const bucket: ?FillExtrusionBucket = (tile.getBucket(layer): any);
            if (!bucket) continue;

            const depthMode = new DepthMode(painter.context.gl.LEQUAL, DepthMode.ReadWrite, [0, 1]),
                stencilMode = StencilMode.disabled,
                colorMode = painter.colorModeForRenderPass();

            drawExtrusion(painter, source, layer, tile, coord, bucket, depthMode, stencilMode, colorMode);
        }
    } else if (painter.renderPass === 'translucent') {
        drawExtrusionTexture(painter, layer);
    }
}

function drawToExtrusionFramebuffer(painter, layer) {
    const context = painter.context;
    const gl = context.gl;

    let renderTarget = layer.viewportFrame;

    if (painter.depthRboNeedsClear) {
        painter.setupOffscreenDepthRenderbuffer();
    }

    if (!renderTarget) {
        const texture = new Texture(context, {width: painter.width, height: painter.height, data: null}, gl.RGBA);
        texture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE);

        renderTarget = layer.viewportFrame = context.createFramebuffer(painter.width, painter.height);
        renderTarget.colorAttachment.set(texture.texture);
    }

    context.bindFramebuffer.set(renderTarget.framebuffer);
    renderTarget.depthAttachment.set(painter.depthRbo);

    if (painter.depthRboNeedsClear) {
        context.clear({ depth: 1 });
        painter.depthRboNeedsClear = false;
    }

    context.clear({ color: Color.transparent });
}

function drawExtrusionTexture(painter, layer) {
    const renderedTexture = layer.viewportFrame;
    if (!renderedTexture) return;

    const context = painter.context;
    const gl = context.gl;

    context.activeTexture.set(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderedTexture.colorAttachment.get());

    painter.useProgram('extrusionTexture').draw(context, gl.TRIANGLES,
        DepthMode.disabled, StencilMode.disabled,
        painter.colorModeForRenderPass(),
        extrusionTextureUniformValues(painter, layer, 0),
        layer.id, painter.viewportBuffer, painter.quadTriangleIndexBuffer,
        painter.viewportSegments, layer.paint, painter.transform.zoom);
}

function drawExtrusion(painter, source, layer, tile, coord, bucket, depthMode, stencilMode, colorMode) {
    const context = painter.context;
    const gl = context.gl;

    const programConfiguration = bucket.programConfigurations.get(layer.id);

    const image = layer.paint.get('fill-extrusion-pattern');
    if (image && painter.isPatternMissing(image)) return;

    const program = painter.useProgram(image ? 'fillExtrusionPattern' : 'fillExtrusion', programConfiguration);

    const matrix = painter.translatePosMatrix(
        coord.posMatrix,
        tile,
        layer.paint.get('fill-extrusion-translate'),
        layer.paint.get('fill-extrusion-translate-anchor'));

    const uniformValues = image ?
        fillExtrusionPatternUniformValues(matrix, painter, coord, image, tile) :
        fillExtrusionUniformValues(matrix, painter);

    program.draw(context, gl.TRIANGLES, depthMode, stencilMode, colorMode,
        uniformValues, layer.id, bucket.layoutVertexBuffer, bucket.indexBuffer,
        bucket.segments, layer.paint, painter.transform.zoom,
        programConfiguration);
}
