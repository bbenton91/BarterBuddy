
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
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
    function set_store_value(store, ret, value = ret) {
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
        node.parentNode.removeChild(node);
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
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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
            mount_component(component, options.target, options.anchor);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.1' }, detail)));
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

    /* src\Tailwindcss.svelte generated by Svelte v3.32.1 */

    function create_fragment(ctx) {
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
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Tailwindcss", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tailwindcss> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Tailwindcss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwindcss",
    			options,
    			id: create_fragment.name
    		});
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
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
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
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const listings = writable([]);
    const filteredListings = writable([]);

    /* src\InputItem.svelte generated by Svelte v3.32.1 */

    const file = "src\\InputItem.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (8:0) {#each inputs as inputItem}
    function create_each_block(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let a;
    	let img;
    	let img_src_value;
    	let a_href_value;
    	let t0;
    	let span;
    	let t1;
    	let t2_value = /*inputItem*/ ctx[2].amount + "";
    	let t2;
    	let t3;
    	let t4_value = /*inputItem*/ ctx[2].name + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			t1 = text("x");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(img, "class", "self-center");
    			if (img.src !== (img_src_value = "/images" + /*inputItem*/ ctx[2].iconHref)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file, 13, 109, 546);
    			attr_dev(a, "class", "self-center max-w-4 lg:max-w-sm h-auto");
    			attr_dev(a, "href", a_href_value = /*gamepediaUrl*/ ctx[1] + /*inputItem*/ ctx[2].relativeHref);
    			add_location(a, file, 13, 16, 453);
    			attr_dev(span, "class", "self-center pl-1");
    			add_location(span, file, 14, 16, 635);
    			attr_dev(div0, "class", "flex justify-center");
    			add_location(div0, file, 12, 12, 402);
    			attr_dev(div1, "class", "flex flex-col justify-items-center");
    			add_location(div1, file, 10, 8, 276);
    			attr_dev(div2, "class", "flex justify-center mb-2 mt-2");
    			add_location(div2, file, 8, 4, 184);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a);
    			append_dev(a, img);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div2, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inputs*/ 1 && img.src !== (img_src_value = "/images" + /*inputItem*/ ctx[2].iconHref)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*gamepediaUrl, inputs*/ 3 && a_href_value !== (a_href_value = /*gamepediaUrl*/ ctx[1] + /*inputItem*/ ctx[2].relativeHref)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*inputs*/ 1 && t2_value !== (t2_value = /*inputItem*/ ctx[2].amount + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*inputs*/ 1 && t4_value !== (t4_value = /*inputItem*/ ctx[2].name + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(8:0) {#each inputs as inputItem}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*inputs*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			if (dirty & /*inputs, gamepediaUrl*/ 3) {
    				each_value = /*inputs*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("InputItem", slots, []);
    	
    	let { inputs } = $$props;
    	let { gamepediaUrl } = $$props;
    	const writable_props = ["inputs", "gamepediaUrl"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InputItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("inputs" in $$props) $$invalidate(0, inputs = $$props.inputs);
    		if ("gamepediaUrl" in $$props) $$invalidate(1, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	$$self.$capture_state = () => ({ inputs, gamepediaUrl });

    	$$self.$inject_state = $$props => {
    		if ("inputs" in $$props) $$invalidate(0, inputs = $$props.inputs);
    		if ("gamepediaUrl" in $$props) $$invalidate(1, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [inputs, gamepediaUrl];
    }

    class InputItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { inputs: 0, gamepediaUrl: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputItem",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*inputs*/ ctx[0] === undefined && !("inputs" in props)) {
    			console.warn("<InputItem> was created without expected prop 'inputs'");
    		}

    		if (/*gamepediaUrl*/ ctx[1] === undefined && !("gamepediaUrl" in props)) {
    			console.warn("<InputItem> was created without expected prop 'gamepediaUrl'");
    		}
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

    /* src\Trader.svelte generated by Svelte v3.32.1 */

    const file$1 = "src\\Trader.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let a;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let a_href_value;
    	let t0;
    	let t1_value = /*trader*/ ctx[0].name + "";
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(img, "class", "self-center");
    			if (img.src !== (img_src_value = "/images" + /*trader*/ ctx[0].iconHref)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*trader*/ ctx[0].name);
    			add_location(img, file$1, 7, 8, 200);
    			attr_dev(a, "href", a_href_value = /*gamepediaUrl*/ ctx[1] + /*trader*/ ctx[0].relativeHref);
    			add_location(a, file$1, 6, 4, 147);
    			attr_dev(div, "class", "flex flex-col justify-items-center items-center");
    			add_location(div, file$1, 5, 0, 80);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, img);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*trader*/ 1 && img.src !== (img_src_value = "/images" + /*trader*/ ctx[0].iconHref)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*trader*/ 1 && img_alt_value !== (img_alt_value = /*trader*/ ctx[0].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*gamepediaUrl, trader*/ 3 && a_href_value !== (a_href_value = /*gamepediaUrl*/ ctx[1] + /*trader*/ ctx[0].relativeHref)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*trader*/ 1 && t1_value !== (t1_value = /*trader*/ ctx[0].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Trader", slots, []);
    	
    	let { trader } = $$props;
    	let { gamepediaUrl } = $$props;
    	const writable_props = ["trader", "gamepediaUrl"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Trader> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("trader" in $$props) $$invalidate(0, trader = $$props.trader);
    		if ("gamepediaUrl" in $$props) $$invalidate(1, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	$$self.$capture_state = () => ({ trader, gamepediaUrl });

    	$$self.$inject_state = $$props => {
    		if ("trader" in $$props) $$invalidate(0, trader = $$props.trader);
    		if ("gamepediaUrl" in $$props) $$invalidate(1, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [trader, gamepediaUrl];
    }

    class Trader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { trader: 0, gamepediaUrl: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trader",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*trader*/ ctx[0] === undefined && !("trader" in props)) {
    			console.warn("<Trader> was created without expected prop 'trader'");
    		}

    		if (/*gamepediaUrl*/ ctx[1] === undefined && !("gamepediaUrl" in props)) {
    			console.warn("<Trader> was created without expected prop 'gamepediaUrl'");
    		}
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

    /* src\Trades.svelte generated by Svelte v3.32.1 */
    const file$2 = "src\\Trades.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (21:12) {#each $filteredListings as listing}
    function create_each_block$1(ctx) {
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
    				inputs: /*listing*/ ctx[2].inputs,
    				gamepediaUrl: /*gamepediaUrl*/ ctx[0]
    			},
    			$$inline: true
    		});

    	trader = new Trader({
    			props: {
    				trader: /*listing*/ ctx[2].trader,
    				gamepediaUrl: /*gamepediaUrl*/ ctx[0]
    			},
    			$$inline: true
    		});

    	inputitem1 = new InputItem({
    			props: {
    				inputs: [/*listing*/ ctx[2].output],
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
    			attr_dev(td0, "class", "border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6 svelte-b2iufc");
    			add_location(td0, file$2, 24, 20, 733);
    			attr_dev(td1, "class", "border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6 svelte-b2iufc");
    			add_location(td1, file$2, 29, 20, 984);
    			attr_dev(td2, "class", "border-2 border-color p-1 lg:p-4 w-1/12 lg:w-1/6 svelte-b2iufc");
    			add_location(td2, file$2, 34, 20, 1239);
    			attr_dev(tr, "class", "border-2 text-xs lg:text-base");
    			add_location(tr, file$2, 21, 16, 613);
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
    			if (dirty & /*$filteredListings*/ 2) inputitem0_changes.inputs = /*listing*/ ctx[2].inputs;
    			if (dirty & /*gamepediaUrl*/ 1) inputitem0_changes.gamepediaUrl = /*gamepediaUrl*/ ctx[0];
    			inputitem0.$set(inputitem0_changes);
    			const trader_changes = {};
    			if (dirty & /*$filteredListings*/ 2) trader_changes.trader = /*listing*/ ctx[2].trader;
    			if (dirty & /*gamepediaUrl*/ 1) trader_changes.gamepediaUrl = /*gamepediaUrl*/ ctx[0];
    			trader.$set(trader_changes);
    			const inputitem1_changes = {};
    			if (dirty & /*$filteredListings*/ 2) inputitem1_changes.inputs = [/*listing*/ ctx[2].output];
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
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(21:12) {#each $filteredListings as listing}",
    		ctx
    	});

    	return block;
    }

    // (47:4) {#if $filteredListings.length == 0}
    function create_if_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "No results found. Try another search";
    			attr_dev(div, "class", "flex justify-center");
    			add_location(div, file$2, 47, 8, 1750);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(47:4) {#if $filteredListings.length == 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let table;
    	let tbody;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let t6;
    	let current;
    	let each_value = /*$filteredListings*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*$filteredListings*/ ctx[1].length == 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
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

    			t6 = space();
    			if (if_block) if_block.c();
    			add_location(th0, file$2, 15, 16, 435);
    			add_location(th1, file$2, 16, 16, 468);
    			add_location(th2, file$2, 17, 16, 509);
    			add_location(tr, file$2, 14, 12, 413);
    			add_location(tbody, file$2, 13, 8, 392);
    			add_location(table, file$2, 12, 4, 375);
    			attr_dev(main, "class", "p-4 mx-auto text-center w-full lg:w-4/6 text-svelte");
    			add_location(main, file$2, 11, 0, 303);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, table);
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

    			append_dev(main, t6);
    			if (if_block) if_block.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$filteredListings, gamepediaUrl*/ 3) {
    				each_value = /*$filteredListings*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
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

    			if (/*$filteredListings*/ ctx[1].length == 0) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
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
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
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

    function instance$3($$self, $$props, $$invalidate) {
    	let $filteredListings;
    	validate_store(filteredListings, "filteredListings");
    	component_subscribe($$self, filteredListings, $$value => $$invalidate(1, $filteredListings = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Trades", slots, []);
    	let { gamepediaUrl } = $$props;
    	const writable_props = ["gamepediaUrl"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Trades> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("gamepediaUrl" in $$props) $$invalidate(0, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	$$self.$capture_state = () => ({
    		filteredListings,
    		listings,
    		InputItem,
    		Trader,
    		gamepediaUrl,
    		$filteredListings
    	});

    	$$self.$inject_state = $$props => {
    		if ("gamepediaUrl" in $$props) $$invalidate(0, gamepediaUrl = $$props.gamepediaUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [gamepediaUrl, $filteredListings];
    }

    class Trades extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { gamepediaUrl: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trades",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*gamepediaUrl*/ ctx[0] === undefined && !("gamepediaUrl" in props)) {
    			console.warn("<Trades> was created without expected prop 'gamepediaUrl'");
    		}
    	}

    	get gamepediaUrl() {
    		throw new Error("<Trades>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gamepediaUrl(value) {
    		throw new Error("<Trades>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Search.svelte generated by Svelte v3.32.1 */

    const { console: console_1 } = globals;
    const file$3 = "src\\Search.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			input = element("input");
    			attr_dev(input, "class", "text-gray-400 bg-gray-800 rounded mt-5 mb-5 pl-1 pr-1 pt-1 pb-1 w-full lg:w-80");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search Here");
    			add_location(input, file$3, 14, 4, 454);
    			add_location(main, file$3, 13, 0, 442);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, input);
    			set_input_value(input, /*searchText*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(input, "input", /*input_handler*/ ctx[3], false, false, false)
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $filteredListings;
    	let $listings;
    	validate_store(filteredListings, "filteredListings");
    	component_subscribe($$self, filteredListings, $$value => $$invalidate(5, $filteredListings = $$value));
    	validate_store(listings, "listings");
    	component_subscribe($$self, listings, $$value => $$invalidate(6, $listings = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Search", slots, []);
    	var timeoutFunc;
    	var searchText = "";

    	function filter(text) {
    		clearTimeout(timeoutFunc);

    		timeoutFunc = setTimeout(
    			() => {
    				console.log("filtering " + text);
    				var re = new RegExp(text, "gmi");
    				set_store_value(filteredListings, $filteredListings = $listings.filter(x => x.inputs.some(y => y.name.match(re) || x.output.name.match(re))), $filteredListings);
    			},
    			500
    		);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		searchText = this.value;
    		$$invalidate(0, searchText);
    	}

    	const input_handler = () => filter(searchText);

    	$$self.$capture_state = () => ({
    		filteredListings,
    		listings,
    		timeoutFunc,
    		searchText,
    		filter,
    		$filteredListings,
    		$listings
    	});

    	$$self.$inject_state = $$props => {
    		if ("timeoutFunc" in $$props) timeoutFunc = $$props.timeoutFunc;
    		if ("searchText" in $$props) $$invalidate(0, searchText = $$props.searchText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [searchText, filter, input_input_handler, input_handler];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const durationUnitRegex = /[a-zA-Z]/;

    const range = (size, startAt = 0) =>
      [...Array(size).keys()].map(i => i + startAt);

    /* node_modules\svelte-loading-spinners\src\Jumper.svelte generated by Svelte v3.32.1 */
    const file$4 = "node_modules\\svelte-loading-spinners\\src\\Jumper.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (45:2) {#each range(3, 1) as version}
    function create_each_block$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "circle svelte-vcw43z");
    			set_style(div, "animation-delay", /*durationNum*/ ctx[5] / 3 * (/*version*/ ctx[6] - 1) + /*durationUnit*/ ctx[4]);
    			add_location(div, file$4, 45, 4, 918);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(45:2) {#each range(3, 1) as version}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let each_value = range(3, 1);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "wrapper svelte-vcw43z");
    			set_style(div, "--size", /*size*/ ctx[0] + /*unit*/ ctx[2]);
    			set_style(div, "--color", /*color*/ ctx[1]);
    			set_style(div, "--duration", /*duration*/ ctx[3]);
    			add_location(div, file$4, 43, 0, 785);
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
    			if (dirty & /*durationNum, range, durationUnit*/ 48) {
    				each_value = range(3, 1);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*size, unit*/ 5) {
    				set_style(div, "--size", /*size*/ ctx[0] + /*unit*/ ctx[2]);
    			}

    			if (dirty & /*color*/ 2) {
    				set_style(div, "--color", /*color*/ ctx[1]);
    			}

    			if (dirty & /*duration*/ 8) {
    				set_style(div, "--duration", /*duration*/ ctx[3]);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Jumper", slots, []);
    	let { size = 60 } = $$props;
    	let { color = "#FF3E00" } = $$props;
    	let { unit = "px" } = $$props;
    	let { duration = "1s" } = $$props;
    	let durationUnit = duration.match(durationUnitRegex)[0];
    	let durationNum = duration.replace(durationUnitRegex, "");
    	const writable_props = ["size", "color", "unit", "duration"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Jumper> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("size" in $$props) $$invalidate(0, size = $$props.size);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("unit" in $$props) $$invalidate(2, unit = $$props.unit);
    		if ("duration" in $$props) $$invalidate(3, duration = $$props.duration);
    	};

    	$$self.$capture_state = () => ({
    		range,
    		durationUnitRegex,
    		size,
    		color,
    		unit,
    		duration,
    		durationUnit,
    		durationNum
    	});

    	$$self.$inject_state = $$props => {
    		if ("size" in $$props) $$invalidate(0, size = $$props.size);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("unit" in $$props) $$invalidate(2, unit = $$props.unit);
    		if ("duration" in $$props) $$invalidate(3, duration = $$props.duration);
    		if ("durationUnit" in $$props) $$invalidate(4, durationUnit = $$props.durationUnit);
    		if ("durationNum" in $$props) $$invalidate(5, durationNum = $$props.durationNum);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [size, color, unit, duration, durationUnit, durationNum];
    }

    class Jumper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { size: 0, color: 1, unit: 2, duration: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jumper",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get size() {
    		throw new Error("<Jumper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Jumper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
    }

    /* src\App.svelte generated by Svelte v3.32.1 */

    const { console: console_1$1 } = globals;
    const file$5 = "src\\App.svelte";

    // (99:1) {:catch error}
    function create_catch_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "There was a problem. Try again later.";
    			attr_dev(div, "class", "flex justify-center items-center h-40 text-red-400");
    			add_location(div, file$5, 99, 2, 4687);
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
    		source: "(99:1) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (97:1) {:then value}
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
    		source: "(97:1) {:then value}",
    		ctx
    	});

    	return block;
    }

    // (93:18)    <div class="flex justify-center items-center h-40">    <Jumper size="60" color="#FF3E00" unit="px" duration="1s"></Jumper>   </div>  {:then value}
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
    			add_location(div, file$5, 93, 2, 4480);
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
    		source: "(93:18)    <div class=\\\"flex justify-center items-center h-40\\\">    <Jumper size=\\\"60\\\" color=\\\"#FF3E00\\\" unit=\\\"px\\\" duration=\\\"1s\\\"></Jumper>   </div>  {:then value}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
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
    		value: 7,
    		error: 8,
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
    			attr_dev(h1, "class", "uppercase text-4xl lg:text-6xl leading-normal font-thin text-svelte");
    			add_location(h1, file$5, 85, 1, 3826);
    			attr_dev(h2, "class", "text-base lg:text-2xl leading-normal font-thin text-svelte mt-2 italic");
    			add_location(h2, file$5, 86, 1, 3924);
    			add_location(br0, file$5, 87, 1, 4088);
    			add_location(br1, file$5, 87, 5, 4092);
    			attr_dev(main, "class", "p-4 mx-auto w-full lg:w-5/6 text-center");
    			add_location(main, file$5, 84, 0, 3770);
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
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[7] = child_ctx[8] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const barterUrl = "/escapefromtarkov.gamepedia.com/Barter_trades";

    /**
     * Tries to get cached trades. If successful, will return an Array of Trade objects. Otherwise, an empty array is returned
     * @param name The name of the object to retrieve
     * @param cachelife The life of the cache. If the current time minus the stored data's life is less than this, we return empty
     */
    function getCachedData(name, cachelife) {
    	var _a;
    	var cachelife = cachelife * 1000;

    	var cachedString = (_a = localStorage.getItem(name)) !== null && _a !== void 0
    	? _a
    	: "";

    	if (cachedString !== "") {
    		var cachedData = JSON.parse(cachedString);
    		var trades = JSON.parse(cachedData.data);
    		var expired = Date.now() > cachedData.cacheTime + cachelife;

    		if (expired) {
    			localStorage.removeItem(name);
    			return [];
    		}

    		return trades;
    	}

    	return [];
    }

    function setCachedData(name, data) {
    	var item = { data, cacheTime: Date.now() };
    	localStorage.setItem(name, JSON.stringify(item));
    	console.log("data is set");
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $listings;
    	let $filteredListings;
    	validate_store(listings, "listings");
    	component_subscribe($$self, listings, $$value => $$invalidate(2, $listings = $$value));
    	validate_store(filteredListings, "filteredListings");
    	component_subscribe($$self, filteredListings, $$value => $$invalidate(3, $filteredListings = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

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
    	// This actuall works but it wants to complain
    	document.body.classList = [];

    	function getData() {
    		return __awaiter(this, void 0, void 0, function* () {
    			// We do this because the data from getCachedData can be large and kinda slow.
    			// So this await lets the page actually load (background and stuff) and then it can load the saved data
    			yield new Promise(resolve => setTimeout(resolve, 300));

    			// Then we try to get the cached data
    			var data = getCachedData("trades", cacheLifeTime);

    			// If our cached data is empty, fetch from the server
    			if (data.length < 1) {
    				console.log("fetching server data");

    				// var response = await fetch("https://eftbarters.link:443/get-data")
    				var response = yield fetch("http://eftbarters.link:9775/get-data");

    				var responseText = yield response.text();
    				let trades = JSON.parse(responseText);
    				setCachedData("trades", responseText);
    				return trades;
    			}

    			console.log("Fetching saved local data");

    			// Otherwise return our local data
    			return data;
    		});
    	}

    	// ParseAmmo.GetBartersAndCrafts().then(data => {$listings = data; $filteredListings = data})
    	var response = getData().then(data => {
    		set_store_value(listings, $listings = data, $listings);
    		set_store_value(filteredListings, $filteredListings = data, $filteredListings);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		__awaiter,
    		Tailwindcss,
    		Trades,
    		Search,
    		listings,
    		filteredListings,
    		Jumper,
    		gamepediaUrl,
    		barterUrl,
    		cacheLifeTime,
    		getData,
    		getCachedData,
    		setCachedData,
    		response,
    		$listings,
    		$filteredListings
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("response" in $$props) $$invalidate(1, response = $$props.response);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [gamepediaUrl, response];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { gamepediaUrl: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
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
