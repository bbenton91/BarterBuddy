
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    // Adapted from https://github.com/then/is-promise/blob/master/index.js
    // Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
    function is_promise(value) {
        return !!value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const durationUnitRegex = /[a-zA-Z]/;
    const range = (size, startAt = 0) => [...Array(size).keys()].map((i) => i + startAt);
    // export const characterRange = (startChar, endChar) =>
    //   String.fromCharCode(
    //     ...range(
    //       endChar.charCodeAt(0) - startChar.charCodeAt(0),
    //       startChar.charCodeAt(0)
    //     )
    //   );
    // export const zip = (arr, ...arrs) =>
    //   arr.map((val, i) => arrs.reduce((list, curr) => [...list, curr[i]], [val]));

    /* node_modules\svelte-loading-spinners\Jumper.svelte generated by Svelte v3.55.1 */
    const file = "node_modules\\svelte-loading-spinners\\Jumper.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (12:1) {#each range(3, 1) as version}
    function create_each_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "circle svelte-1y0lc6i");
    			set_style(div, "animation-delay", +/*durationNum*/ ctx[6] / 3 * (/*version*/ ctx[7] - 1) + /*durationUnit*/ ctx[5]);
    			toggle_class(div, "pause-animation", /*pause*/ ctx[4]);
    			add_location(div, file, 12, 2, 464);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pause*/ 16) {
    				toggle_class(div, "pause-animation", /*pause*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(12:1) {#each range(3, 1) as version}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let each_value = range(3, 1);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "wrapper svelte-1y0lc6i");
    			set_style(div, "--size", /*size*/ ctx[3] + /*unit*/ ctx[1]);
    			set_style(div, "--color", /*color*/ ctx[0]);
    			set_style(div, "--duration", /*duration*/ ctx[2]);
    			add_location(div, file, 10, 0, 336);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*durationNum, range, durationUnit, pause*/ 112) {
    				each_value = range(3, 1);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*size, unit*/ 10) {
    				set_style(div, "--size", /*size*/ ctx[3] + /*unit*/ ctx[1]);
    			}

    			if (dirty & /*color*/ 1) {
    				set_style(div, "--color", /*color*/ ctx[0]);
    			}

    			if (dirty & /*duration*/ 4) {
    				set_style(div, "--duration", /*duration*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Jumper', slots, []);
    	let { color = '#FF3E00' } = $$props;
    	let { unit = 'px' } = $$props;
    	let { duration = '1s' } = $$props;
    	let { size = '60' } = $$props;
    	let { pause = false } = $$props;
    	let durationUnit = duration.match(durationUnitRegex)?.[0] ?? 's';
    	let durationNum = duration.replace(durationUnitRegex, '');
    	const writable_props = ['color', 'unit', 'duration', 'size', 'pause'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Jumper> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('color' in $$props) $$invalidate(0, color = $$props.color);
    		if ('unit' in $$props) $$invalidate(1, unit = $$props.unit);
    		if ('duration' in $$props) $$invalidate(2, duration = $$props.duration);
    		if ('size' in $$props) $$invalidate(3, size = $$props.size);
    		if ('pause' in $$props) $$invalidate(4, pause = $$props.pause);
    	};

    	$$self.$capture_state = () => ({
    		range,
    		durationUnitRegex,
    		color,
    		unit,
    		duration,
    		size,
    		pause,
    		durationUnit,
    		durationNum
    	});

    	$$self.$inject_state = $$props => {
    		if ('color' in $$props) $$invalidate(0, color = $$props.color);
    		if ('unit' in $$props) $$invalidate(1, unit = $$props.unit);
    		if ('duration' in $$props) $$invalidate(2, duration = $$props.duration);
    		if ('size' in $$props) $$invalidate(3, size = $$props.size);
    		if ('pause' in $$props) $$invalidate(4, pause = $$props.pause);
    		if ('durationUnit' in $$props) $$invalidate(5, durationUnit = $$props.durationUnit);
    		if ('durationNum' in $$props) $$invalidate(6, durationNum = $$props.durationNum);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [color, unit, duration, size, pause, durationUnit, durationNum];
    }

    class Jumper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			color: 0,
    			unit: 1,
    			duration: 2,
    			size: 3,
    			pause: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jumper",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get color() {
    		throw new Error("<Jumper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Jumper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get unit() {
    		throw new Error("<Jumper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set unit(value) {
    		throw new Error("<Jumper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get duration() {
    		throw new Error("<Jumper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set duration(value) {
    		throw new Error("<Jumper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Jumper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Jumper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pause() {
    		throw new Error("<Jumper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pause(value) {
    		throw new Error("<Jumper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function emptyItem() {
        return { name: "", title: "", amount: -1, iconHref: "", relativeHref: "" };
    }
    function emptyItemInfo() {
        return { itemName: "", questDescriptions: [], itemAbbreviation: "", locations: [], hideoutRequirements: [] };
    }

    const listings = writable([]);
    const itemInfo = writable(new Map());
    const filteredListings = writable([]);
    const showingAmount = writable(25);
    const currentItemInfo = writable(emptyItemInfo());
    const currentItem = writable(emptyItem());

    /* src\Search.svelte generated by Svelte v3.55.1 */
    const file$1 = "src\\Search.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let div;
    	let input;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "x";
    			attr_dev(input, "id", "itemSearchInput");
    			attr_dev(input, "class", "text-gray-400 bg-gray-800 rounded pl-1 pr-1 pt-1 pb-1 w-full lg:w-80");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search Here");
    			add_location(input, file$1, 21, 8, 950);
    			attr_dev(button, "class", "flex text-svelte text-center pl-2 pr-2 text-xl remove-focus svelte-p7xezd");
    			add_location(button, file$1, 22, 8, 1163);
    			attr_dev(div, "class", "flex mt-5 mb-5 justify-center");
    			add_location(div, file$1, 20, 4, 897);
    			add_location(main, file$1, 19, 0, 885);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, input);
    			set_input_value(input, /*searchText*/ ctx[0]);
    			append_dev(div, t0);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(input, "input", /*input_handler*/ ctx[3], false, false, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*searchText*/ 1 && input.value !== /*searchText*/ ctx[0]) {
    				set_input_value(input, /*searchText*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $filteredListings;
    	let $showingAmount;
    	let $itemInfo;
    	let $listings;
    	validate_store(filteredListings, 'filteredListings');
    	component_subscribe($$self, filteredListings, $$value => $$invalidate(6, $filteredListings = $$value));
    	validate_store(showingAmount, 'showingAmount');
    	component_subscribe($$self, showingAmount, $$value => $$invalidate(7, $showingAmount = $$value));
    	validate_store(itemInfo, 'itemInfo');
    	component_subscribe($$self, itemInfo, $$value => $$invalidate(8, $itemInfo = $$value));
    	validate_store(listings, 'listings');
    	component_subscribe($$self, listings, $$value => $$invalidate(9, $listings = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Search', slots, []);
    	var timeoutFunc;
    	var searchText = "";

    	function filter(text) {
    		clearTimeout(timeoutFunc);

    		timeoutFunc = setTimeout(
    			() => {
    				var re = new RegExp(text, 'gmi');

    				// console.log(text);
    				// console.log($listings);
    				set_store_value(
    					filteredListings,
    					$filteredListings = $listings.filter(x => {
    						var _a;

    						return x.inputs.some(y => {
    							var _a;

    							return y.name.match(re) || ((_a = $itemInfo.get(y.name)) === null || _a === void 0
    							? void 0
    							: _a.abbreviation.match(re));
    						}) || x.output.name.match(re) || x.trader.name.match(re) || ((_a = $itemInfo.get(x.output.name)) === null || _a === void 0
    						? void 0
    						: _a.abbreviation.match(re));
    					}),
    					$filteredListings
    				);

    				set_store_value(showingAmount, $showingAmount = text !== "" ? $filteredListings.length : 25, $showingAmount);
    			},
    			500
    		);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		searchText = this.value;
    		$$invalidate(0, searchText);
    	}

    	const input_handler = () => filter(searchText);

    	const click_handler = () => {
    		$$invalidate(0, searchText = "");
    		filter("");
    	};

    	$$self.$capture_state = () => ({
    		filteredListings,
    		itemInfo,
    		listings,
    		showingAmount,
    		timeoutFunc,
    		searchText,
    		filter,
    		$filteredListings,
    		$showingAmount,
    		$itemInfo,
    		$listings
    	});

    	$$self.$inject_state = $$props => {
    		if ('timeoutFunc' in $$props) timeoutFunc = $$props.timeoutFunc;
    		if ('searchText' in $$props) $$invalidate(0, searchText = $$props.searchText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [searchText, filter, input_input_handler, input_handler, click_handler];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\Tailwindcss.svelte generated by Svelte v3.55.1 */

    function create_fragment$2(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tailwindcss', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tailwindcss> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Tailwindcss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwindcss",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\InputItem.svelte generated by Svelte v3.55.1 */

    const { console: console_1 } = globals;
    const file$2 = "src\\InputItem.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (38:0) {#each inputs as inputItem}
    function create_each_block$1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let span;
    	let t1;
    	let t2_value = /*inputItem*/ ctx[13].amount + "";
    	let t2;
    	let t3;
    	let a1;
    	let t4_value = /*inputItem*/ ctx[13].title + "";
    	let t4;
    	let div1_id_value;
    	let t5;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[5](/*inputItem*/ ctx[13]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[6](/*inputItem*/ ctx[13]);
    	}

    	function mouseover_handler(...args) {
    		return /*mouseover_handler*/ ctx[7](/*inputItem*/ ctx[13], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			t1 = text("x");
    			t2 = text(t2_value);
    			t3 = space();
    			a1 = element("a");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(img, "class", "self-center");
    			if (!src_url_equal(img.src, img_src_value = "/images" + /*inputItem*/ ctx[13].iconHref)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$2, 45, 20, 2067);
    			attr_dev(a0, "class", "cursor-pointer self-center max-w-3 lg:max-w-lg h-auto");
    			add_location(a0, file$2, 44, 16, 1937);
    			attr_dev(span, "class", "self-center pl-1");
    			add_location(span, file$2, 47, 16, 2174);
    			attr_dev(div0, "class", "flex justify-center");
    			add_location(div0, file$2, 42, 12, 1823);
    			attr_dev(a1, "class", "cursor-pointer");
    			add_location(a1, file$2, 50, 12, 2324);
    			attr_dev(div1, "id", div1_id_value = "inputItem-" + /*inputItem*/ ctx[13].name.split(" ").join("_"));
    			attr_dev(div1, "class", "flex flex-col justify-items-center");
    			add_location(div1, file$2, 40, 8, 1487);
    			attr_dev(div2, "class", "flex justify-center mb-2 mt-2");
    			add_location(div2, file$2, 38, 4, 1395);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(div1, t3);
    			append_dev(div1, a1);
    			append_dev(a1, t4);
    			append_dev(div2, t5);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", click_handler, false, false, false),
    					listen_dev(a1, "click", click_handler_1, false, false, false),
    					listen_dev(div1, "mousemove", /*handleMouseMove*/ ctx[4], false, false, false),
    					listen_dev(div1, "mouseleave", /*handleMouseLeave*/ ctx[3], false, false, false),
    					listen_dev(div1, "mouseover", mouseover_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*inputs*/ 1 && !src_url_equal(img.src, img_src_value = "/images" + /*inputItem*/ ctx[13].iconHref)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*inputs*/ 1 && t2_value !== (t2_value = /*inputItem*/ ctx[13].amount + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*inputs*/ 1 && t4_value !== (t4_value = /*inputItem*/ ctx[13].title + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*inputs*/ 1 && div1_id_value !== (div1_id_value = "inputItem-" + /*inputItem*/ ctx[13].name.split(" ").join("_"))) {
    				attr_dev(div1, "id", div1_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(38:0) {#each inputs as inputItem}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let each_1_anchor;
    	let each_value = /*inputs*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*inputs, handleMouseMove, handleMouseLeave, startMouseMove, window, gamepediaUrl, setSearch*/ 31) {
    				each_value = /*inputs*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function setSearch(text) {
    	let input = document.querySelector("#itemSearchInput");
    	input.value = text;
    	input.dispatchEvent(new Event("input"));
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $currentItem;
    	let $currentItemInfo;
    	let $itemInfo;
    	validate_store(currentItem, 'currentItem');
    	component_subscribe($$self, currentItem, $$value => $$invalidate(9, $currentItem = $$value));
    	validate_store(currentItemInfo, 'currentItemInfo');
    	component_subscribe($$self, currentItemInfo, $$value => $$invalidate(10, $currentItemInfo = $$value));
    	validate_store(itemInfo, 'itemInfo');
    	component_subscribe($$self, itemInfo, $$value => $$invalidate(11, $itemInfo = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('InputItem', slots, []);
    	let { inputs } = $$props;
    	let { gamepediaUrl } = $$props;
    	let m = { x: 0, y: 0 };
    	let elem;

    	function startMouseMove(event, name, item) {
    		var _a;

    		// let element = document.querySelector(id);
    		let itemName = name.split("_").join(" ");

    		let storedItemInfo = (_a = $itemInfo.get(itemName)) !== null && _a !== void 0
    		? _a
    		: emptyItemInfo();

    		set_store_value(currentItemInfo, $currentItemInfo = storedItemInfo, $currentItemInfo);
    		set_store_value(currentItem, $currentItem = item, $currentItem);
    	} // console.log($itemInfo)

    	function handleMouseLeave(event) {
    		elem === null || elem === void 0
    		? void 0
    		: elem.classList.add("hidden");
    	}

    	function handleMouseMove(event) {
    		let tooltip = document.querySelector("#tooltip");

    		tooltip === null || tooltip === void 0
    		? void 0
    		: tooltip.classList.remove("hidden");

    		tooltip.style.left = event.clientX + 20 + "px";
    		tooltip.style.top = event.clientY - tooltip.offsetHeight / 2 + window.pageYOffset + "px";
    		elem = tooltip;
    	}

    	console.log(inputs);

    	$$self.$$.on_mount.push(function () {
    		if (inputs === undefined && !('inputs' in $$props || $$self.$$.bound[$$self.$$.props['inputs']])) {
    			console_1.warn("<InputItem> was created without expected prop 'inputs'");
    		}

    		if (gamepediaUrl === undefined && !('gamepediaUrl' in $$props || $$self.$$.bound[$$self.$$.props['gamepediaUrl']])) {
    			console_1.warn("<InputItem> was created without expected prop 'gamepediaUrl'");
    		}
    	});

    	const writable_props = ['inputs', 'gamepediaUrl'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<InputItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = inputItem => setSearch(inputItem.name);
    	const click_handler_1 = inputItem => window.open(gamepediaUrl + inputItem.relativeHref, '_blank');
    	const mouseover_handler = (inputItem, evt) => startMouseMove(evt, inputItem.name.split(" ").join("_"), inputItem);

    	$$self.$$set = $$props => {
    		if ('inputs' in $$props) $$invalidate(0, inputs = $$props.inputs);
    		if ('gamepediaUrl' in $$props) $$invalidate(1, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	$$self.$capture_state = () => ({
    		listings,
    		itemInfo,
    		currentItemInfo,
    		currentItem,
    		emptyItemInfo,
    		inputs,
    		gamepediaUrl,
    		m,
    		elem,
    		setSearch,
    		startMouseMove,
    		handleMouseLeave,
    		handleMouseMove,
    		$currentItem,
    		$currentItemInfo,
    		$itemInfo
    	});

    	$$self.$inject_state = $$props => {
    		if ('inputs' in $$props) $$invalidate(0, inputs = $$props.inputs);
    		if ('gamepediaUrl' in $$props) $$invalidate(1, gamepediaUrl = $$props.gamepediaUrl);
    		if ('m' in $$props) m = $$props.m;
    		if ('elem' in $$props) elem = $$props.elem;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		inputs,
    		gamepediaUrl,
    		startMouseMove,
    		handleMouseLeave,
    		handleMouseMove,
    		click_handler,
    		click_handler_1,
    		mouseover_handler
    	];
    }

    class InputItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { inputs: 0, gamepediaUrl: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputItem",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get inputs() {
    		throw new Error("<InputItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inputs(value) {
    		throw new Error("<InputItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gamepediaUrl() {
    		throw new Error("<InputItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gamepediaUrl(value) {
    		throw new Error("<InputItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Trader.svelte generated by Svelte v3.55.1 */

    const file$3 = "src\\Trader.svelte";

    // (16:8) {#if trader.iconHref != ""}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "self-center max-w-4 lg:max-w-md");
    			if (!src_url_equal(img.src, img_src_value = "/images" + /*trader*/ ctx[0].iconHref)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*trader*/ ctx[0].name);
    			add_location(img, file$3, 17, 12, 635);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*trader*/ 1 && !src_url_equal(img.src, img_src_value = "/images" + /*trader*/ ctx[0].iconHref)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*trader*/ 1 && img_alt_value !== (img_alt_value = /*trader*/ ctx[0].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(16:8) {#if trader.iconHref != \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let a;
    	let t0;
    	let span;
    	let t1_value = /*trader*/ ctx[0].name + "";
    	let t1;
    	let mounted;
    	let dispose;
    	let if_block = /*trader*/ ctx[0].iconHref != "" && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			if (if_block) if_block.c();
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(a, "class", "cursor-pointer");
    			add_location(a, file$3, 14, 4, 401);
    			attr_dev(span, "class", "cursor-pointer");
    			add_location(span, file$3, 21, 4, 767);
    			attr_dev(div, "class", "flex flex-col justify-items-center items-center");
    			add_location(div, file$3, 12, 0, 283);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			if (if_block) if_block.m(a, null);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev(span, "click", /*click_handler_1*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*trader*/ ctx[0].iconHref != "") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(a, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*trader*/ 1 && t1_value !== (t1_value = /*trader*/ ctx[0].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function setSearch$1(text) {
    	let input = document.querySelector("#itemSearchInput");
    	input.value = text;
    	input.dispatchEvent(new Event("input"));
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Trader', slots, []);
    	let { trader } = $$props;
    	let { gamepediaUrl } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (trader === undefined && !('trader' in $$props || $$self.$$.bound[$$self.$$.props['trader']])) {
    			console.warn("<Trader> was created without expected prop 'trader'");
    		}

    		if (gamepediaUrl === undefined && !('gamepediaUrl' in $$props || $$self.$$.bound[$$self.$$.props['gamepediaUrl']])) {
    			console.warn("<Trader> was created without expected prop 'gamepediaUrl'");
    		}
    	});

    	const writable_props = ['trader', 'gamepediaUrl'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Trader> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setSearch$1(trader.name.split(" ")[0]);
    	const click_handler_1 = () => window.open(gamepediaUrl + trader.relativeHref, "_blank");

    	$$self.$$set = $$props => {
    		if ('trader' in $$props) $$invalidate(0, trader = $$props.trader);
    		if ('gamepediaUrl' in $$props) $$invalidate(1, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	$$self.$capture_state = () => ({ trader, gamepediaUrl, setSearch: setSearch$1 });

    	$$self.$inject_state = $$props => {
    		if ('trader' in $$props) $$invalidate(0, trader = $$props.trader);
    		if ('gamepediaUrl' in $$props) $$invalidate(1, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [trader, gamepediaUrl, click_handler, click_handler_1];
    }

    class Trader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { trader: 0, gamepediaUrl: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trader",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get trader() {
    		throw new Error("<Trader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set trader(value) {
    		throw new Error("<Trader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gamepediaUrl() {
    		throw new Error("<Trader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gamepediaUrl(value) {
    		throw new Error("<Trader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Tooltip.svelte generated by Svelte v3.55.1 */
    const file$4 = "src\\Tooltip.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (15:1) {#if $currentItemInfo.questDescriptions.length > 0}
    function create_if_block_1(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let each_value_1 = /*$currentItemInfo*/ ctx[0].questDescriptions;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Quests";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h2, "class", "text-lg mt-2");
    			add_location(h2, file$4, 15, 2, 467);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$currentItemInfo*/ 1) {
    				each_value_1 = /*$currentItemInfo*/ ctx[0].questDescriptions;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:1) {#if $currentItemInfo.questDescriptions.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (17:2) {#each $currentItemInfo.questDescriptions as quest}
    function create_each_block_1(ctx) {
    	let p;
    	let t_value = /*quest*/ ctx[4] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "ml-2");
    			add_location(p, file$4, 17, 3, 563);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$currentItemInfo*/ 1 && t_value !== (t_value = /*quest*/ ctx[4] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(17:2) {#each $currentItemInfo.questDescriptions as quest}",
    		ctx
    	});

    	return block;
    }

    // (22:1) {#if $currentItemInfo.locations.length > 0}
    function create_if_block$1(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let each_value = /*$currentItemInfo*/ ctx[0].locations;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Locations";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h2, "class", "text-lg mt-2");
    			add_location(h2, file$4, 22, 2, 662);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$currentItemInfo*/ 1) {
    				each_value = /*$currentItemInfo*/ ctx[0].locations;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(22:1) {#if $currentItemInfo.locations.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (24:2) {#each $currentItemInfo.locations as location}
    function create_each_block$2(ctx) {
    	let p;
    	let t_value = /*location*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "ml-2");
    			add_location(p, file$4, 24, 3, 756);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$currentItemInfo*/ 1 && t_value !== (t_value = /*location*/ ctx[1] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(24:2) {#each $currentItemInfo.locations as location}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let main;
    	let h2;
    	let t0_value = /*$currentItemInfo*/ ctx[0].itemName + "";
    	let t0;
    	let t1;
    	let t2_value = /*$currentItemInfo*/ ctx[0]?.itemAbbreviation + "";
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let if_block0 = /*$currentItemInfo*/ ctx[0].questDescriptions.length > 0 && create_if_block_1(ctx);
    	let if_block1 = /*$currentItemInfo*/ ctx[0].locations.length > 0 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(")");
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h2, "class", "text-xl");
    			add_location(h2, file$4, 12, 1, 316);
    			attr_dev(main, "id", "tooltip");
    			attr_dev(main, "class", "text-left p-4 mx-auto text-svelte hidden svelte-1qxgk56");
    			add_location(main, file$4, 11, 0, 245);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h2);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(h2, t2);
    			append_dev(h2, t3);
    			append_dev(main, t4);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t5);
    			if (if_block1) if_block1.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$currentItemInfo*/ 1 && t0_value !== (t0_value = /*$currentItemInfo*/ ctx[0].itemName + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$currentItemInfo*/ 1 && t2_value !== (t2_value = /*$currentItemInfo*/ ctx[0]?.itemAbbreviation + "")) set_data_dev(t2, t2_value);

    			if (/*$currentItemInfo*/ ctx[0].questDescriptions.length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(main, t5);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*$currentItemInfo*/ ctx[0].locations.length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(main, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $currentItemInfo;
    	validate_store(currentItemInfo, 'currentItemInfo');
    	component_subscribe($$self, currentItemInfo, $$value => $$invalidate(0, $currentItemInfo = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tooltip', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tooltip> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		currentItem,
    		currentItemInfo,
    		$currentItemInfo
    	});

    	return [$currentItemInfo];
    }

    class Tooltip extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tooltip",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Trades.svelte generated by Svelte v3.55.1 */

    const { window: window_1 } = globals;
    const file$5 = "src\\Trades.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (43:4) {:else}
    function create_else_block(ctx) {
    	let table;
    	let tbody;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let current;
    	let each_value = { length: /*$showingAmount*/ ctx[2] };
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			table = element("table");
    			tbody = element("tbody");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Inputs";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Trader/Hideout";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Output";
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(th0, file$5, 46, 20, 1572);
    			add_location(th1, file$5, 47, 20, 1609);
    			add_location(th2, file$5, 48, 20, 1654);
    			add_location(tr, file$5, 45, 16, 1546);
    			add_location(tbody, file$5, 44, 12, 1521);
    			attr_dev(table, "id", "mainTable");
    			add_location(table, file$5, 43, 8, 1485);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, tbody);
    			append_dev(tbody, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t1);
    			append_dev(tr, th1);
    			append_dev(tr, t3);
    			append_dev(tr, th2);
    			append_dev(tbody, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$filteredListings, gamepediaUrl, $showingAmount*/ 7) {
    				each_value = { length: /*$showingAmount*/ ctx[2] };
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (39:4) {#if $filteredListings.length == 0}
    function create_if_block$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "No results found. Try another search";
    			attr_dev(div, "class", "flex justify-center");
    			add_location(div, file$5, 39, 8, 1363);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(39:4) {#if $filteredListings.length == 0}",
    		ctx
    	});

    	return block;
    }

    // (65:20) {:else}
    function create_else_block_1(ctx) {
    	let tr;
    	let td0;
    	let inputitem0;
    	let t0;
    	let td1;
    	let trader;
    	let t1;
    	let td2;
    	let inputitem1;
    	let t2;
    	let current;

    	inputitem0 = new InputItem({
    			props: {
    				inputs: /*$filteredListings*/ ctx[1][/*i*/ ctx[9]].inputs,
    				gamepediaUrl: /*gamepediaUrl*/ ctx[0]
    			},
    			$$inline: true
    		});

    	trader = new Trader({
    			props: {
    				trader: /*$filteredListings*/ ctx[1][/*i*/ ctx[9]].trader,
    				gamepediaUrl: /*gamepediaUrl*/ ctx[0]
    			},
    			$$inline: true
    		});

    	inputitem1 = new InputItem({
    			props: {
    				inputs: [/*$filteredListings*/ ctx[1][/*i*/ ctx[9]].output],
    				gamepediaUrl: /*gamepediaUrl*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			create_component(inputitem0.$$.fragment);
    			t0 = space();
    			td1 = element("td");
    			create_component(trader.$$.fragment);
    			t1 = space();
    			td2 = element("td");
    			create_component(inputitem1.$$.fragment);
    			t2 = space();
    			attr_dev(td0, "class", "border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6 svelte-kntvbb");
    			add_location(td0, file$5, 68, 28, 2684);
    			attr_dev(td1, "class", "border-2 border-color p-1 lg:p-4 lg:w-1/6 svelte-kntvbb");
    			add_location(td1, file$5, 73, 28, 2977);
    			attr_dev(td2, "class", "border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6 svelte-kntvbb");
    			add_location(td2, file$5, 78, 28, 3270);
    			attr_dev(tr, "class", "border-2 text-xs lg:text-base");
    			add_location(tr, file$5, 65, 24, 2548);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			mount_component(inputitem0, td0, null);
    			append_dev(tr, t0);
    			append_dev(tr, td1);
    			mount_component(trader, td1, null);
    			append_dev(tr, t1);
    			append_dev(tr, td2);
    			mount_component(inputitem1, td2, null);
    			append_dev(tr, t2);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const inputitem0_changes = {};
    			if (dirty & /*$filteredListings*/ 2) inputitem0_changes.inputs = /*$filteredListings*/ ctx[1][/*i*/ ctx[9]].inputs;
    			if (dirty & /*gamepediaUrl*/ 1) inputitem0_changes.gamepediaUrl = /*gamepediaUrl*/ ctx[0];
    			inputitem0.$set(inputitem0_changes);
    			const trader_changes = {};
    			if (dirty & /*$filteredListings*/ 2) trader_changes.trader = /*$filteredListings*/ ctx[1][/*i*/ ctx[9]].trader;
    			if (dirty & /*gamepediaUrl*/ 1) trader_changes.gamepediaUrl = /*gamepediaUrl*/ ctx[0];
    			trader.$set(trader_changes);
    			const inputitem1_changes = {};
    			if (dirty & /*$filteredListings*/ 2) inputitem1_changes.inputs = [/*$filteredListings*/ ctx[1][/*i*/ ctx[9]].output];
    			if (dirty & /*gamepediaUrl*/ 1) inputitem1_changes.gamepediaUrl = /*gamepediaUrl*/ ctx[0];
    			inputitem1.$set(inputitem1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inputitem0.$$.fragment, local);
    			transition_in(trader.$$.fragment, local);
    			transition_in(inputitem1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inputitem0.$$.fragment, local);
    			transition_out(trader.$$.fragment, local);
    			transition_out(inputitem1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_component(inputitem0);
    			destroy_component(trader);
    			destroy_component(inputitem1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(65:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (53:20) {#if i%10 == 0}
    function create_if_block_1$1(ctx) {
    	let script0;
    	let script0_src_value;
    	let t0;
    	let ins;
    	let t1;
    	let script1;

    	const block = {
    		c: function create() {
    			script0 = element("script");
    			t0 = space();
    			ins = element("ins");
    			t1 = space();
    			script1 = element("script");
    			script1.textContent = "(adsbygoogle = window.adsbygoogle || []).push({});\r\n                        ";
    			script0.async = true;
    			if (!src_url_equal(script0.src, script0_src_value = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7853339352311833")) attr_dev(script0, "src", script0_src_value);
    			attr_dev(script0, "crossorigin", "anonymous");
    			add_location(script0, file$5, 53, 24, 1821);
    			attr_dev(ins, "class", "adsbygoogle");
    			set_style(ins, "display", "block");
    			attr_dev(ins, "data-ad-format", "fluid");
    			attr_dev(ins, "data-ad-layout-key", "-g1+5+1+2-3");
    			attr_dev(ins, "data-ad-client", "ca-pub-7853339352311833");
    			attr_dev(ins, "data-ad-slot", "6570031173");
    			add_location(ins, file$5, 55, 24, 2023);
    			add_location(script1, file$5, 61, 24, 2370);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, script0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, ins, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, script1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(script0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(ins);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(script1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(53:20) {#if i%10 == 0}",
    		ctx
    	});

    	return block;
    }

    // (52:16) {#each {length: $showingAmount} as listing, i}
    function create_each_block$3(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*i*/ ctx[9] % 10 == 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(52:16) {#each {length: $showingAmount} as listing, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let main;
    	let tooltip;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
    	tooltip = new Tooltip({ $$inline: true });
    	const if_block_creators = [create_if_block$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$filteredListings*/ ctx[1].length == 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(tooltip.$$.fragment);
    			t = space();
    			if_block.c();
    			attr_dev(main, "class", "p-4 mx-auto text-center w-full lg:w-4/6 text-svelte tall svelte-kntvbb");
    			add_location(main, file$5, 35, 0, 1119);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(tooltip, main, null);
    			append_dev(main, t);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "scroll", /*handleWheel*/ ctx[3], false, false, false),
    					listen_dev(main, "mouseenter", /*startMouseMove*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tooltip.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tooltip.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(tooltip);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function clamp(num, min, max) {
    	return Math.min(Math.max(num, min), max);
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $currentItemInfo;
    	let $currentItem;
    	let $filteredListings;
    	let $showingAmount;
    	validate_store(currentItemInfo, 'currentItemInfo');
    	component_subscribe($$self, currentItemInfo, $$value => $$invalidate(5, $currentItemInfo = $$value));
    	validate_store(currentItem, 'currentItem');
    	component_subscribe($$self, currentItem, $$value => $$invalidate(6, $currentItem = $$value));
    	validate_store(filteredListings, 'filteredListings');
    	component_subscribe($$self, filteredListings, $$value => $$invalidate(1, $filteredListings = $$value));
    	validate_store(showingAmount, 'showingAmount');
    	component_subscribe($$self, showingAmount, $$value => $$invalidate(2, $showingAmount = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Trades', slots, []);
    	let { gamepediaUrl } = $$props;

    	const handleWheel = e => {
    		if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 500) {
    			set_store_value(showingAmount, $showingAmount = clamp($showingAmount + 25, 0, $filteredListings.length), $showingAmount);
    		}

    		e.preventDefault();
    	};

    	function startMouseMove(event) {
    		var _a;
    		set_store_value(currentItem, $currentItem = emptyItem(), $currentItem);
    		set_store_value(currentItemInfo, $currentItemInfo = emptyItemInfo(), $currentItemInfo);

    		(_a = document.querySelector("#tooltip")) === null || _a === void 0
    		? void 0
    		: _a.classList.add("hidden");
    	}

    	$$self.$$.on_mount.push(function () {
    		if (gamepediaUrl === undefined && !('gamepediaUrl' in $$props || $$self.$$.bound[$$self.$$.props['gamepediaUrl']])) {
    			console.warn("<Trades> was created without expected prop 'gamepediaUrl'");
    		}
    	});

    	const writable_props = ['gamepediaUrl'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Trades> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('gamepediaUrl' in $$props) $$invalidate(0, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	$$self.$capture_state = () => ({
    		currentItem,
    		currentItemInfo,
    		filteredListings,
    		listings,
    		showingAmount,
    		InputItem,
    		Trader,
    		Tooltip,
    		emptyItem,
    		emptyItemInfo,
    		empty,
    		gamepediaUrl,
    		handleWheel,
    		clamp,
    		startMouseMove,
    		$currentItemInfo,
    		$currentItem,
    		$filteredListings,
    		$showingAmount
    	});

    	$$self.$inject_state = $$props => {
    		if ('gamepediaUrl' in $$props) $$invalidate(0, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [gamepediaUrl, $filteredListings, $showingAmount, handleWheel, startMouseMove];
    }

    class Trades extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { gamepediaUrl: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trades",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get gamepediaUrl() {
    		throw new Error("<Trades>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gamepediaUrl(value) {
    		throw new Error("<Trades>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.55.1 */

    const { console: console_1$1 } = globals;
    const file$6 = "src\\App.svelte";

    // (114:1) {:catch error}
    function create_catch_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "There was a problem. Try again later.";
    			attr_dev(div, "class", "flex justify-center items-center h-40 text-red-400");
    			add_location(div, file$6, 114, 2, 5402);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(114:1) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (112:1) {:then value}
    function create_then_block(ctx) {
    	let trades;
    	let current;

    	trades = new Trades({
    			props: { gamepediaUrl: /*gamepediaUrl*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(trades.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(trades, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(trades.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(trades.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(trades, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(112:1) {:then value}",
    		ctx
    	});

    	return block;
    }

    // (108:18)     <div class="flex justify-center items-center h-40">     <Jumper size="60" color="#FF3E00" unit="px" duration="1s"></Jumper>    </div>   {:then value}
    function create_pending_block(ctx) {
    	let div;
    	let jumper;
    	let current;

    	jumper = new Jumper({
    			props: {
    				size: "60",
    				color: "#FF3E00",
    				unit: "px",
    				duration: "1s"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(jumper.$$.fragment);
    			attr_dev(div, "class", "flex justify-center items-center h-40");
    			add_location(div, file$6, 108, 2, 5189);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(jumper, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jumper.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jumper.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(jumper);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(108:18)     <div class=\\\"flex justify-center items-center h-40\\\">     <Jumper size=\\\"60\\\" color=\\\"#FF3E00\\\" unit=\\\"px\\\" duration=\\\"1s\\\"></Jumper>    </div>   {:then value}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let tailwindcss;
    	let t0;
    	let main;
    	let h1;
    	let t2;
    	let h2;
    	let t4;
    	let br0;
    	let br1;
    	let t5;
    	let search;
    	let t6;
    	let t7;
    	let script0;
    	let script0_src_value;
    	let t8;
    	let ins;
    	let t9;
    	let script1;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	search = new Search({ $$inline: true });

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 8,
    		error: 9,
    		blocks: [,,,]
    	};

    	handle_promise(/*response*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "EFT Barters";
    			t2 = space();
    			h2 = element("h2");
    			h2.textContent = "An easy way to search for barters and hideout crafts in Escape from Tarkov";
    			t4 = space();
    			br0 = element("br");
    			br1 = element("br");
    			t5 = space();
    			create_component(search.$$.fragment);
    			t6 = space();
    			info.block.c();
    			t7 = space();
    			script0 = element("script");
    			t8 = space();
    			ins = element("ins");
    			t9 = space();
    			script1 = element("script");
    			script1.textContent = "(adsbygoogle = window.adsbygoogle || []).push({});";
    			attr_dev(h1, "class", "uppercase text-4xl lg:text-6xl leading-normal font-thin text-svelte");
    			add_location(h1, file$6, 100, 1, 4527);
    			attr_dev(h2, "class", "text-base lg:text-2xl leading-normal font-thin text-svelte mt-2 italic");
    			add_location(h2, file$6, 101, 1, 4626);
    			add_location(br0, file$6, 102, 1, 4791);
    			add_location(br1, file$6, 102, 5, 4795);
    			script0.async = true;
    			if (!src_url_equal(script0.src, script0_src_value = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7853339352311833")) attr_dev(script0, "src", script0_src_value);
    			attr_dev(script0, "crossorigin", "anonymous");
    			add_location(script0, file$6, 119, 1, 5534);
    			attr_dev(ins, "class", "adsbygoogle");
    			set_style(ins, "display", "block");
    			attr_dev(ins, "data-ad-format", "autorelaxed");
    			attr_dev(ins, "data-ad-client", "ca-pub-7853339352311833");
    			attr_dev(ins, "data-ad-slot", "6725943847");
    			add_location(ins, file$6, 121, 1, 5690);
    			add_location(script1, file$6, 126, 1, 5854);
    			attr_dev(main, "class", "p-4 mx-auto w-full lg:w-5/6 text-center min-h-full");
    			add_location(main, file$6, 99, 0, 4459);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t2);
    			append_dev(main, h2);
    			append_dev(main, t4);
    			append_dev(main, br0);
    			append_dev(main, br1);
    			append_dev(main, t5);
    			mount_component(search, main, null);
    			append_dev(main, t6);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = t7;
    			append_dev(main, t7);
    			append_dev(main, script0);
    			append_dev(main, t8);
    			append_dev(main, ins);
    			append_dev(main, t9);
    			append_dev(main, script1);
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(search.$$.fragment, local);
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(search.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(search);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getCachedData(name, cachelife, defaultValue) {
    	var _a;
    	var cachelife = cachelife * 1000;

    	var cachedString = (_a = localStorage.getItem(name)) !== null && _a !== void 0
    	? _a
    	: "";

    	if (cachedString !== "") {
    		var cachedData = JSON.parse(cachedString);
    		var data = JSON.parse(cachedData.data);
    		var expired = Date.now() > cachedData.cacheTime + cachelife;

    		if (expired) {
    			localStorage.removeItem(name);
    			return defaultValue;
    		}

    		return data;
    	}

    	return defaultValue;
    }

    function setCachedData(name, data) {
    	var item = { data, cacheTime: Date.now() };
    	localStorage.setItem(name, JSON.stringify(item));
    	console.log('data is set');
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $itemInfo;
    	let $filteredListings;
    	let $listings;
    	validate_store(itemInfo, 'itemInfo');
    	component_subscribe($$self, itemInfo, $$value => $$invalidate(2, $itemInfo = $$value));
    	validate_store(filteredListings, 'filteredListings');
    	component_subscribe($$self, filteredListings, $$value => $$invalidate(3, $filteredListings = $$value));
    	validate_store(listings, 'listings');
    	component_subscribe($$self, listings, $$value => $$invalidate(4, $listings = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};
    	const gamepediaUrl = "https://escapefromtarkov.gamepedia.com";

    	// The lifetime of cache data in seconds. 60*60 = 1 hour of cache
    	const cacheLifeTime = 60 * 60;

    	// ParseAmmo.Parse(corsRedirect+baseUrl+ammoUrl);
    	// This actually works but it wants to complain
    	// Clears all existing classes from the body
    	document.body.classList = [];

    	// Adds a minimum full height class to the body
    	document.body.classList.add("min-h-full");

    	function getData() {
    		return __awaiter(this, void 0, void 0, function* () {
    			// console.log(dotenv.config())
    			// We do this because the data from getCachedData can be large and kinda slow.
    			// So this await lets the page actually load (background and stuff) and then it can load the saved data
    			yield new Promise(resolve => setTimeout(resolve, 300));

    			// Then we try to get the cached data
    			var trades = getCachedData("trades", cacheLifeTime, []);

    			var info = getCachedData("extendedInfo", cacheLifeTime, []);
    			let data = { trades, extendedInfo: info };

    			// If our cached data is empty, fetch from the server
    			if (data.trades.length < 1) {
    				console.log("fetching server data");
    				var response = yield fetch("https://eftbarters.com/api/get-data");
    				var responseText = yield response.text();
    				let responseData = JSON.parse(responseText);
    				setCachedData('trades', JSON.stringify(responseData.trades));
    				setCachedData('extendedInfo', JSON.stringify(responseData.extendedInfo));
    				return responseData;
    			}

    			console.log("Fetching saved local data");

    			// Otherwise return our local data
    			return data;
    		});
    	}

    	// ParseAmmo.GetBartersAndCrafts().then(data => {$listings = data; $filteredListings = data})
    	var response = getData().then(data => {
    		set_store_value(listings, $listings = data.trades, $listings);
    		set_store_value(filteredListings, $filteredListings = data.trades, $filteredListings);
    		let map = new Map();

    		for (let info of data.extendedInfo) {
    			// console.log(info.name);
    			map.set(info.itemName, info);
    		}

    		// console.log(data.extendedInfo);
    		// console.log(map);
    		set_store_value(itemInfo, $itemInfo = map, $itemInfo);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		__awaiter,
    		Jumper,
    		Search,
    		filteredListings,
    		itemInfo,
    		listings,
    		Tailwindcss,
    		Trades,
    		gamepediaUrl,
    		cacheLifeTime,
    		getData,
    		getCachedData,
    		setCachedData,
    		response,
    		$itemInfo,
    		$filteredListings,
    		$listings
    	});

    	$$self.$inject_state = $$props => {
    		if ('__awaiter' in $$props) __awaiter = $$props.__awaiter;
    		if ('response' in $$props) $$invalidate(1, response = $$props.response);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [gamepediaUrl, response];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { gamepediaUrl: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get gamepediaUrl() {
    		return this.$$.ctx[0];
    	}

    	set gamepediaUrl(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
