// @flow
import validateStyleMin from '../style-spec/validate_style.min';
import { ErrorEvent } from '../util/evented';

import type {Evented} from '../util/evented';

type ValidationError = {
    message: string,
    line: number
};

type Validator = (Object) => $ReadOnlyArray<ValidationError>;

export const validateStyle = (validateStyleMin: (Object, ?Object) => $ReadOnlyArray<ValidationError>);
export const {
    source: validateSource,
    light: validateLight,
    layer: validateLayer,
    filter: validateFilter,
    paintProperty: validatePaintProperty,
    layoutProperty: validateLayoutProperty
} = (validateStyleMin: { [string]: Validator });

export function emitValidationErrors(emitter: Evented, errors: ?$ReadOnlyArray<{message: string}>) {
    if (errors && errors.length) {
        for (const {message} of errors) {
            emitter.fire(new ErrorEvent(new Error(message)));
        }
        return true;
    } else {
        return false;
    }
}
