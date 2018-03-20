import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { takeUntil } from 'rxjs/operators/takeUntil';
import { MonoTypeOperatorFunction } from 'rxjs/interfaces';

import { ErrorMessages } from './error-messages';

/**
 * A Map where the component instance is stored as the key
 * and the destroy$ subject as the value
 * @type {WeakMap<Object, Observable>}
 */
const instanceDestroy$Map: WeakMap<object, any> = new WeakMap();

/**
 * An RxJs operator which takes an Angular class instance as a parameter. When the component is destroyed, the stream will be
 * unsubscribed from.
 *
 * <b>Important:</b> Make sure you have either {@link Destroyable @Destroyable} decorating your class like so:
 * <pre><code>
 * @Destroyable
 * @Component({
 *   ...
 * })
 * export class ExampleComponent {}
 * </code></pre>
 *
 * or that your class implements OnDestroy like so:
 * <pre><code>
 * @Component({
 *   ...
 * })
 * export class ExampleComponent implements OnDestroy {
 *    ngOnDestroy () {}
 * }
 * </code></pre>
 *
 * @example
 * <pre><code>
 * ngOnInit() {
 *   this.randomObservable
 *     .pipe(takeUntilDestroy(this))
 *     .subscribe((val) => console.log(val))
 * }
 * </code></pre>
 * @param {Object} target (normally `this`)
 * @returns {Observable<T>}
 */
export const takeUntilDestroy: any = <T>(target: any): MonoTypeOperatorFunction<T> => <T>(stream: Observable<T>) => {
  const originalDestroy: any = target.ngOnDestroy;

  // Shortcut
  if (typeof originalDestroy !== 'function') {
    throw new Error(ErrorMessages.NO_NGONDESTROY);
  }

  if (instanceDestroy$Map.has(target)) {
    const destroy$FoundInMap: Observable<null> = instanceDestroy$Map.get(target);

    return stream.pipe(takeUntil(destroy$FoundInMap));
  }

  const newDestroy$: Subject<null> = new Subject<null>();

  instanceDestroy$Map.set(target, newDestroy$.asObservable());

  target.ngOnDestroy = function (): void {
    // No need to call or apply with arguments, ngOnDestroy is supposed to be a callback without any args
    // Call is faster than apply.
    originalDestroy.call(target);

    newDestroy$.next();
    newDestroy$.complete();

    // Be sure target is removed from map after destroy (could be a memory leak after a lot of route change and/or on component reload)
    instanceDestroy$Map.delete(target);
  };

  return stream.pipe(takeUntil(newDestroy$.asObservable()));
};
