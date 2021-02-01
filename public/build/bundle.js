
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
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

    /* src\ModeSwitcher.svelte generated by Svelte v3.32.1 */
    const file = "src\\ModeSwitcher.svelte";

    // (25:2) {:else}
    function create_else_block(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M494.2 221.9l-59.8-40.5 13.7-71c2.6-13.2-1.6-26.8-11.1-36.4-9.6-9.5-23.2-13.7-36.2-11.1l-70.9 13.7-40.4-59.9c-15.1-22.3-51.9-22.3-67 0l-40.4 59.9-70.8-13.7C98 60.4 84.5 64.5 75 74.1c-9.5 9.6-13.7 23.1-11.1 36.3l13.7 71-59.8 40.5C6.6 229.5 0 242 0 255.5s6.7 26 17.8 33.5l59.8 40.5-13.7 71c-2.6 13.2 1.6 26.8 11.1 36.3 9.5 9.5 22.9 13.7 36.3 11.1l70.8-13.7 40.4 59.9C230 505.3 242.6 512 256 512s26-6.7 33.5-17.8l40.4-59.9 70.9 13.7c13.4 2.7 26.8-1.6 36.3-11.1 9.5-9.5 13.6-23.1 11.1-36.3l-13.7-71 59.8-40.5c11.1-7.5 17.8-20.1 17.8-33.5-.1-13.6-6.7-26.1-17.9-33.7zm-112.9 85.6l17.6 91.2-91-17.6L256 458l-51.9-77-90.9 17.6 17.6-91.2-76.8-52 76.8-52-17.6-91.2 91 17.6L256 53l51.9 76.9 91-17.6-17.6 91.1 76.8 52-76.8 52.1zM256 152c-57.3 0-104 46.7-104 104s46.7 104 104 104 104-46.7 104-104-46.7-104-104-104zm0 160c-30.9 0-56-25.1-56-56s25.1-56 56-56 56 25.1 56 56-25.1 56-56 56z");
    			add_location(path, file, 25, 184, 1684);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "focusable", "false");
    			attr_dev(svg, "data-prefix", "far");
    			attr_dev(svg, "data-icon", "sun");
    			attr_dev(svg, "class", "svg-inline--fa fa-sun fa-w-16");
    			attr_dev(svg, "role", "img");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file, 25, 2, 1502);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(25:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (23:2) {#if darkMode}
    function create_if_block(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M279.135 512c78.756 0 150.982-35.804 198.844-94.775 28.27-34.831-2.558-85.722-46.249-77.401-82.348 15.683-158.272-47.268-158.272-130.792 0-48.424 26.06-92.292 67.434-115.836 38.745-22.05 28.999-80.788-15.022-88.919A257.936 257.936 0 0 0 279.135 0c-141.36 0-256 114.575-256 256 0 141.36 114.576 256 256 256zm0-464c12.985 0 25.689 1.201 38.016 3.478-54.76 31.163-91.693 90.042-91.693 157.554 0 113.848 103.641 199.2 215.252 177.944C402.574 433.964 344.366 464 279.135 464c-114.875 0-208-93.125-208-208s93.125-208 208-208z");
    			add_location(path, file, 23, 186, 926);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "focusable", "false");
    			attr_dev(svg, "data-prefix", "far");
    			attr_dev(svg, "data-icon", "moon");
    			attr_dev(svg, "class", "svg-inline--fa fa-moon fa-w-16");
    			attr_dev(svg, "role", "img");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file, 23, 2, 742);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(23:2) {#if darkMode}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*darkMode*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "absolute top-0 right-0 w-8 h-8 p-2");
    			add_location(div, file, 21, 0, 652);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*toggleMode*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			mounted = false;
    			dispose();
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

    const THEME_KEY = "themePreference";

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModeSwitcher", slots, []);
    	let darkMode = false;

    	function setDarkTheme(dark) {
    		$$invalidate(0, darkMode = dark);
    		document.documentElement.classList.toggle("dark", darkMode);
    	}

    	function toggleMode() {
    		setDarkTheme(!darkMode);
    		window.localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
    	}

    	onMount(() => {
    		const theme = window.localStorage.getItem(THEME_KEY);

    		if (theme === "dark") {
    			setDarkTheme(true);
    		} else if (theme == null && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    			setDarkTheme(true);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModeSwitcher> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		darkMode,
    		THEME_KEY,
    		setDarkTheme,
    		toggleMode
    	});

    	$$self.$inject_state = $$props => {
    		if ("darkMode" in $$props) $$invalidate(0, darkMode = $$props.darkMode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [darkMode, toggleMode];
    }

    class ModeSwitcher extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModeSwitcher",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const corsRedirect = "https://cors-anywhere.herokuapp.com";
    const barterUrl = "/escapefromtarkov.gamepedia.com/Barter_trades";
    const craftUrl = "/escapefromtarkov.gamepedia.com/Crafts";
    const re = /\/[0-9a-zA-Z.%_-]+\.(png|gif)/gmi;
    class ParseAmmo {
        static async GetBartersAndCrafts() {
            let urls = [corsRedirect + barterUrl, corsRedirect + craftUrl];
            var trades = [];
            for (let index = 0; index < urls.length; index++) {
                const url = urls[index];
                console.log("Starting fetch for " + url);
                const response = await fetch(url);
                var text = await response.text();
                console.log("Starting parse");
                trades = trades.concat(ParseAmmo.gatherTrades(text));
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            return trades;
        }
        static gatherTrades(textContent) {
            let html = document.createElement('html');
            html.innerHTML = textContent;
            let tables = html.querySelector("#mw-content-text").querySelectorAll("table");
            var trades = [];
            // For each table we get the tbody inside.
            for (let index = 0; index < tables.length; index++) {
                const table = tables[index];
                var body = table.querySelector('tbody');
                if (body !== null) {
                    var rows = body.querySelectorAll("tr");
                    // If we have less than 10 rows we can just ignore the entire table.
                    // The trade table has 100s of rows
                    if (rows.length < 1)
                        continue;
                    // Then we loop over each row. Skip the first because it's a header row
                    for (let index = 1; index < rows.length; index++) {
                        const row = rows[index];
                        // row 1,3 are simply arrows
                        // row 0,2,4 are the input, trader, and output items
                        var inputElem = row.children[0];
                        var traderElem = row.children[2];
                        var outputElem = row.children[4];
                        let inputItems = ParseAmmo.parseInputItems(inputElem);
                        let trader = ParseAmmo.parseTrader(traderElem);
                        let outputItem = ParseAmmo.parseInputItems(outputElem)[0];
                        trades.push({ inputs: inputItems, trader: trader, output: outputItem });
                    }
                }
            }
            return trades;
        }
        static parseTrader(element) {
            var _a, _b;
            var links = element.querySelectorAll("a");
            var link = Array.from(links).filter(x => x.innerText !== "")[0];
            let name = link.text;
            var src = (_b = (_a = element === null || element === void 0 ? void 0 : element.querySelector("img")) === null || _a === void 0 ? void 0 : _a.src) !== null && _b !== void 0 ? _b : "";
            var match = src.match(re);
            var imgName = "";
            if (match != null && match.length > 0)
                imgName = match[0];
            return { name: name, iconHref: imgName };
        }
        static parseInputItems(element) {
            var _a, _b, _c, _d;
            var children = Array.from(element.childNodes);
            var names = Array.from(element.querySelectorAll("a[title]")).filter(x => x.querySelector("img") !== null);
            var amounts = children
                .filter(x => x.nodeType == Node.TEXT_NODE) // Only gets text
                .filter(x => !ParseAmmo.isEmptyOrSpaces(x.textContent) && ParseAmmo.isValidInt(x.textContent.trim().slice(1))) // gets valid non-empty numbers. We do slice(1) because numbers are in the format of x1, x60, etc
                .map(x => parseInt(x.textContent.trim().slice(1)));
            var items = [];
            var amountIndex = 0;
            var nameIndex = 0;
            var lastName = "";
            while (nameIndex >= 0 && nameIndex < names.length) {
                var name = names[nameIndex].getAttribute("title").trim();
                if (name != lastName) {
                    lastName = name;
                    // let re = RegExp()
                    var src = (_c = (_b = (_a = names[nameIndex]) === null || _a === void 0 ? void 0 : _a.querySelector("img")) === null || _b === void 0 ? void 0 : _b.src) !== null && _c !== void 0 ? _c : "";
                    if (src === "") {
                        console.log("src is empty for " + name);
                        console.log(names[nameIndex]);
                        console.log((_d = names[nameIndex]) === null || _d === void 0 ? void 0 : _d.querySelector("img"));
                        continue;
                    }
                    var imgName = src.match(re)[0];
                    var amount = amountIndex < amounts.length ? amounts[amountIndex] : 1;
                    var item = { name: lastName, amount: amount, iconHref: imgName, relativeHref: names[nameIndex].getAttribute("href") };
                    items.push(item);
                    amountIndex++;
                }
                nameIndex++;
            }
            // console.log(items)
            return items;
        }
        static isEmptyOrSpaces(str) {
            return str === null || str.match(/^ *$/) !== null;
        }
        static isValidInt(str) {
            return !isNaN(parseInt(str));
        }
    }

    /* src\Tailwindcss.svelte generated by Svelte v3.32.1 */

    function create_fragment$1(ctx) {
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwindcss",
    			options,
    			id: create_fragment$1.name
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

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var digitCharacters = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "#",
        "$",
        "%",
        "*",
        "+",
        ",",
        "-",
        ".",
        ":",
        ";",
        "=",
        "?",
        "@",
        "[",
        "]",
        "^",
        "_",
        "{",
        "|",
        "}",
        "~"
    ];
    var decode83 = function (str) {
        var value = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str[i];
            var digit = digitCharacters.indexOf(c);
            value = value * 83 + digit;
        }
        return value;
    };
    var encode83 = function (n, length) {
        var result = "";
        for (var i = 1; i <= length; i++) {
            var digit = (Math.floor(n) / Math.pow(83, length - i)) % 83;
            result += digitCharacters[Math.floor(digit)];
        }
        return result;
    };


    var base83 = /*#__PURE__*/Object.defineProperty({
    	decode83: decode83,
    	encode83: encode83
    }, '__esModule', {value: true});

    var utils = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sRGBToLinear = function (value) {
        var v = value / 255;
        if (v <= 0.04045) {
            return v / 12.92;
        }
        else {
            return Math.pow((v + 0.055) / 1.055, 2.4);
        }
    };
    exports.linearTosRGB = function (value) {
        var v = Math.max(0, Math.min(1, value));
        if (v <= 0.0031308) {
            return Math.round(v * 12.92 * 255 + 0.5);
        }
        else {
            return Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
        }
    };
    exports.sign = function (n) { return (n < 0 ? -1 : 1); };
    exports.signPow = function (val, exp) {
        return exports.sign(val) * Math.pow(Math.abs(val), exp);
    };

    });

    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();

    var ValidationError = /** @class */ (function (_super) {
        __extends(ValidationError, _super);
        function ValidationError(message) {
            var _this = _super.call(this, message) || this;
            _this.name = "ValidationError";
            _this.message = message;
            return _this;
        }
        return ValidationError;
    }(Error));
    var ValidationError_1 = ValidationError;


    var error = /*#__PURE__*/Object.defineProperty({
    	ValidationError: ValidationError_1
    }, '__esModule', {value: true});

    /**
     * Returns an error message if invalid or undefined if valid
     * @param blurhash
     */
    var validateBlurhash = function (blurhash) {
        if (!blurhash || blurhash.length < 6) {
            throw new error.ValidationError("The blurhash string must be at least 6 characters");
        }
        var sizeFlag = base83.decode83(blurhash[0]);
        var numY = Math.floor(sizeFlag / 9) + 1;
        var numX = (sizeFlag % 9) + 1;
        if (blurhash.length !== 4 + 2 * numX * numY) {
            throw new error.ValidationError("blurhash length mismatch: length is " + blurhash.length + " but it should be " + (4 + 2 * numX * numY));
        }
    };
    var isBlurhashValid = function (blurhash) {
        try {
            validateBlurhash(blurhash);
        }
        catch (error) {
            return { result: false, errorReason: error.message };
        }
        return { result: true };
    };
    var decodeDC = function (value) {
        var intR = value >> 16;
        var intG = (value >> 8) & 255;
        var intB = value & 255;
        return [utils.sRGBToLinear(intR), utils.sRGBToLinear(intG), utils.sRGBToLinear(intB)];
    };
    var decodeAC = function (value, maximumValue) {
        var quantR = Math.floor(value / (19 * 19));
        var quantG = Math.floor(value / 19) % 19;
        var quantB = value % 19;
        var rgb = [
            utils.signPow((quantR - 9) / 9, 2.0) * maximumValue,
            utils.signPow((quantG - 9) / 9, 2.0) * maximumValue,
            utils.signPow((quantB - 9) / 9, 2.0) * maximumValue
        ];
        return rgb;
    };
    var decode = function (blurhash, width, height, punch) {
        validateBlurhash(blurhash);
        punch = punch | 1;
        var sizeFlag = base83.decode83(blurhash[0]);
        var numY = Math.floor(sizeFlag / 9) + 1;
        var numX = (sizeFlag % 9) + 1;
        var quantisedMaximumValue = base83.decode83(blurhash[1]);
        var maximumValue = (quantisedMaximumValue + 1) / 166;
        var colors = new Array(numX * numY);
        for (var i = 0; i < colors.length; i++) {
            if (i === 0) {
                var value = base83.decode83(blurhash.substring(2, 6));
                colors[i] = decodeDC(value);
            }
            else {
                var value = base83.decode83(blurhash.substring(4 + i * 2, 6 + i * 2));
                colors[i] = decodeAC(value, maximumValue * punch);
            }
        }
        var bytesPerRow = width * 4;
        var pixels = new Uint8ClampedArray(bytesPerRow * height);
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var r = 0;
                var g = 0;
                var b = 0;
                for (var j = 0; j < numY; j++) {
                    for (var i = 0; i < numX; i++) {
                        var basis = Math.cos((Math.PI * x * i) / width) *
                            Math.cos((Math.PI * y * j) / height);
                        var color = colors[i + j * numX];
                        r += color[0] * basis;
                        g += color[1] * basis;
                        b += color[2] * basis;
                    }
                }
                var intR = utils.linearTosRGB(r);
                var intG = utils.linearTosRGB(g);
                var intB = utils.linearTosRGB(b);
                pixels[4 * x + 0 + y * bytesPerRow] = intR;
                pixels[4 * x + 1 + y * bytesPerRow] = intG;
                pixels[4 * x + 2 + y * bytesPerRow] = intB;
                pixels[4 * x + 3 + y * bytesPerRow] = 255; // alpha
            }
        }
        return pixels;
    };
    var _default = decode;


    var decode_1 = /*#__PURE__*/Object.defineProperty({
    	isBlurhashValid: isBlurhashValid,
    	default: _default
    }, '__esModule', {value: true});

    var bytesPerPixel = 4;
    var multiplyBasisFunction = function (pixels, width, height, basisFunction) {
        var r = 0;
        var g = 0;
        var b = 0;
        var bytesPerRow = width * bytesPerPixel;
        for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
                var basis = basisFunction(x, y);
                r +=
                    basis * utils.sRGBToLinear(pixels[bytesPerPixel * x + 0 + y * bytesPerRow]);
                g +=
                    basis * utils.sRGBToLinear(pixels[bytesPerPixel * x + 1 + y * bytesPerRow]);
                b +=
                    basis * utils.sRGBToLinear(pixels[bytesPerPixel * x + 2 + y * bytesPerRow]);
            }
        }
        var scale = 1 / (width * height);
        return [r * scale, g * scale, b * scale];
    };
    var encodeDC = function (value) {
        var roundedR = utils.linearTosRGB(value[0]);
        var roundedG = utils.linearTosRGB(value[1]);
        var roundedB = utils.linearTosRGB(value[2]);
        return (roundedR << 16) + (roundedG << 8) + roundedB;
    };
    var encodeAC = function (value, maximumValue) {
        var quantR = Math.floor(Math.max(0, Math.min(18, Math.floor(utils.signPow(value[0] / maximumValue, 0.5) * 9 + 9.5))));
        var quantG = Math.floor(Math.max(0, Math.min(18, Math.floor(utils.signPow(value[1] / maximumValue, 0.5) * 9 + 9.5))));
        var quantB = Math.floor(Math.max(0, Math.min(18, Math.floor(utils.signPow(value[2] / maximumValue, 0.5) * 9 + 9.5))));
        return quantR * 19 * 19 + quantG * 19 + quantB;
    };
    var encode = function (pixels, width, height, componentX, componentY) {
        if (componentX < 1 || componentX > 9 || componentY < 1 || componentY > 9) {
            throw new error.ValidationError("BlurHash must have between 1 and 9 components");
        }
        if (width * height * 4 !== pixels.length) {
            throw new error.ValidationError("Width and height must match the pixels array");
        }
        var factors = [];
        var _loop_1 = function (y) {
            var _loop_2 = function (x) {
                var normalisation = x == 0 && y == 0 ? 1 : 2;
                var factor = multiplyBasisFunction(pixels, width, height, function (i, j) {
                    return normalisation *
                        Math.cos((Math.PI * x * i) / width) *
                        Math.cos((Math.PI * y * j) / height);
                });
                factors.push(factor);
            };
            for (var x = 0; x < componentX; x++) {
                _loop_2(x);
            }
        };
        for (var y = 0; y < componentY; y++) {
            _loop_1(y);
        }
        var dc = factors[0];
        var ac = factors.slice(1);
        var hash = "";
        var sizeFlag = componentX - 1 + (componentY - 1) * 9;
        hash += base83.encode83(sizeFlag, 1);
        var maximumValue;
        if (ac.length > 0) {
            var actualMaximumValue = Math.max.apply(Math, ac.map(function (val) { return Math.max.apply(Math, val); }));
            var quantisedMaximumValue = Math.floor(Math.max(0, Math.min(82, Math.floor(actualMaximumValue * 166 - 0.5))));
            maximumValue = (quantisedMaximumValue + 1) / 166;
            hash += base83.encode83(quantisedMaximumValue, 1);
        }
        else {
            maximumValue = 1;
            hash += base83.encode83(0, 1);
        }
        hash += base83.encode83(encodeDC(dc), 4);
        ac.forEach(function (factor) {
            hash += base83.encode83(encodeAC(factor, maximumValue), 2);
        });
        return hash;
    };
    var _default$1 = encode;


    var encode_1 = /*#__PURE__*/Object.defineProperty({
    	default: _default$1
    }, '__esModule', {value: true});

    var dist = createCommonjsModule(function (module, exports) {
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });

    exports.decode = decode_1.default;
    exports.isBlurhashValid = decode_1.isBlurhashValid;

    exports.encode = encode_1.default;
    __export(error);

    });

    /* node_modules\svelte-waypoint\src\Waypoint.svelte generated by Svelte v3.32.1 */
    const file$1 = "node_modules\\svelte-waypoint\\src\\Waypoint.svelte";

    // (137:2) {#if visible}
    function create_if_block$1(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1024) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(137:2) {#if visible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*visible*/ ctx[3] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", div_class_value = "wrapper " + /*className*/ ctx[2] + " " + /*c*/ ctx[0] + " svelte-wwh48c");
    			attr_dev(div, "style", /*style*/ ctx[1]);
    			add_location(div, file$1, 135, 0, 3089);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(/*waypoint*/ ctx[4].call(null, div));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*visible*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*className, c*/ 5 && div_class_value !== (div_class_value = "wrapper " + /*className*/ ctx[2] + " " + /*c*/ ctx[0] + " svelte-wwh48c")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (!current || dirty & /*style*/ 2) {
    				attr_dev(div, "style", /*style*/ ctx[1]);
    			}
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
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
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

    function throttleFn(fn, time) {
    	let last, deferTimer;

    	return () => {
    		const now = +new Date();

    		if (last && now < last + time) {
    			// hold on to it
    			clearTimeout(deferTimer);

    			deferTimer = setTimeout(
    				function () {
    					last = now;
    					fn();
    				},
    				time
    			);
    		} else {
    			last = now;
    			fn();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Waypoint", slots, ['default']);
    	const dispatch = createEventDispatcher();
    	let { offset = 0 } = $$props;
    	let { throttle = 250 } = $$props;
    	let { c = "" } = $$props;
    	let { style = "" } = $$props;
    	let { once = true } = $$props;
    	let { threshold = 1 } = $$props;
    	let { disabled = false } = $$props;
    	let { class: className = "" } = $$props;
    	let visible = disabled;
    	let wasVisible = false;
    	let intersecting = false;

    	let removeHandlers = () => {
    		
    	};

    	function callEvents(wasVisible, observer, node) {
    		if (visible && !wasVisible) {
    			dispatch("enter");
    			return;
    		}

    		if (wasVisible && !intersecting) {
    			dispatch("leave");
    		}

    		if (once && wasVisible && !intersecting) {
    			removeHandlers();
    		}
    	}

    	function waypoint(node) {
    		if (!window || disabled) return;

    		if (window.IntersectionObserver && window.IntersectionObserverEntry) {
    			const observer = new IntersectionObserver(([{ isIntersecting }]) => {
    					wasVisible = visible;
    					intersecting = isIntersecting;

    					if (wasVisible && once && !isIntersecting) {
    						callEvents(wasVisible);
    						return;
    					}

    					$$invalidate(3, visible = isIntersecting);
    					callEvents(wasVisible);
    				},
    			{ rootMargin: offset + "px", threshold });

    			observer.observe(node);
    			removeHandlers = () => observer.unobserve(node);
    			return removeHandlers;
    		}

    		function checkIsVisible() {
    			// Kudos https://github.com/twobin/react-lazyload/blob/master/src/index.jsx#L93
    			if (!(node.offsetWidth || node.offsetHeight || node.getClientRects().length)) return;

    			let top;
    			let height;

    			try {
    				({ top, height } = node.getBoundingClientRect());
    			} catch(e) {
    				({ top, height } = defaultBoundingClientRect);
    			}

    			const windowInnerHeight = window.innerHeight || document.documentElement.clientHeight;
    			wasVisible = visible;
    			intersecting = top - offset <= windowInnerHeight && top + height + offset >= 0;

    			if (wasVisible && once && !isIntersecting) {
    				callEvents(wasVisible, observer);
    				return;
    			}

    			$$invalidate(3, visible = intersecting);
    			callEvents(wasVisible);
    		}

    		checkIsVisible();
    		const throttled = throttleFn(checkIsVisible, throttle);
    		window.addEventListener("scroll", throttled);
    		window.addEventListener("resize", throttled);

    		removeHandlers = () => {
    			window.removeEventListener("scroll", throttled);
    			window.removeEventListener("resize", throttled);
    		};

    		return removeHandlers;
    	}

    	const writable_props = ["offset", "throttle", "c", "style", "once", "threshold", "disabled", "class"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Waypoint> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("offset" in $$props) $$invalidate(5, offset = $$props.offset);
    		if ("throttle" in $$props) $$invalidate(6, throttle = $$props.throttle);
    		if ("c" in $$props) $$invalidate(0, c = $$props.c);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("once" in $$props) $$invalidate(7, once = $$props.once);
    		if ("threshold" in $$props) $$invalidate(8, threshold = $$props.threshold);
    		if ("disabled" in $$props) $$invalidate(9, disabled = $$props.disabled);
    		if ("class" in $$props) $$invalidate(2, className = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		dispatch,
    		offset,
    		throttle,
    		c,
    		style,
    		once,
    		threshold,
    		disabled,
    		className,
    		visible,
    		wasVisible,
    		intersecting,
    		removeHandlers,
    		throttleFn,
    		callEvents,
    		waypoint
    	});

    	$$self.$inject_state = $$props => {
    		if ("offset" in $$props) $$invalidate(5, offset = $$props.offset);
    		if ("throttle" in $$props) $$invalidate(6, throttle = $$props.throttle);
    		if ("c" in $$props) $$invalidate(0, c = $$props.c);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    		if ("once" in $$props) $$invalidate(7, once = $$props.once);
    		if ("threshold" in $$props) $$invalidate(8, threshold = $$props.threshold);
    		if ("disabled" in $$props) $$invalidate(9, disabled = $$props.disabled);
    		if ("className" in $$props) $$invalidate(2, className = $$props.className);
    		if ("visible" in $$props) $$invalidate(3, visible = $$props.visible);
    		if ("wasVisible" in $$props) wasVisible = $$props.wasVisible;
    		if ("intersecting" in $$props) intersecting = $$props.intersecting;
    		if ("removeHandlers" in $$props) removeHandlers = $$props.removeHandlers;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		c,
    		style,
    		className,
    		visible,
    		waypoint,
    		offset,
    		throttle,
    		once,
    		threshold,
    		disabled,
    		$$scope,
    		slots
    	];
    }

    class Waypoint extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			offset: 5,
    			throttle: 6,
    			c: 0,
    			style: 1,
    			once: 7,
    			threshold: 8,
    			disabled: 9,
    			class: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Waypoint",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get offset() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offset(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get throttle() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set throttle(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get c() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set c(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get once() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set once(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get threshold() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set threshold(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Waypoint>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Waypoint>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-image\src\Image.svelte generated by Svelte v3.32.1 */
    const file$2 = "node_modules\\svelte-image\\src\\Image.svelte";

    // (90:6) {:else}
    function create_else_block$1(ctx) {
    	let img;
    	let img_class_value;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", img_class_value = "placeholder " + /*placeholderClass*/ ctx[14] + " svelte-u3b0c9");
    			if (img.src !== (img_src_value = /*src*/ ctx[4])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*alt*/ ctx[1]);
    			toggle_class(img, "blur", /*blur*/ ctx[8]);
    			add_location(img, file$2, 90, 8, 2045);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*placeholderClass*/ 16384 && img_class_value !== (img_class_value = "placeholder " + /*placeholderClass*/ ctx[14] + " svelte-u3b0c9")) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (dirty & /*src*/ 16 && img.src !== (img_src_value = /*src*/ ctx[4])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*alt*/ 2) {
    				attr_dev(img, "alt", /*alt*/ ctx[1]);
    			}

    			if (dirty & /*placeholderClass, blur*/ 16640) {
    				toggle_class(img, "blur", /*blur*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(90:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (88:6) {#if blurhash}
    function create_if_block$2(ctx) {
    	let canvas;
    	let canvas_width_value;
    	let canvas_height_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			canvas = element("canvas");
    			attr_dev(canvas, "class", "placeholder svelte-u3b0c9");
    			attr_dev(canvas, "width", canvas_width_value = /*blurhashSize*/ ctx[16].width);
    			attr_dev(canvas, "height", canvas_height_value = /*blurhashSize*/ ctx[16].height);
    			add_location(canvas, file$2, 88, 8, 1917);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(/*decodeBlurhash*/ ctx[20].call(null, canvas));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*blurhashSize*/ 65536 && canvas_width_value !== (canvas_width_value = /*blurhashSize*/ ctx[16].width)) {
    				attr_dev(canvas, "width", canvas_width_value);
    			}

    			if (dirty & /*blurhashSize*/ 65536 && canvas_height_value !== (canvas_height_value = /*blurhashSize*/ ctx[16].height)) {
    				attr_dev(canvas, "height", canvas_height_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(88:6) {#if blurhash}",
    		ctx
    	});

    	return block;
    }

    // (77:0) <Waypoint   class="{wrapperClass}"   style="min-height: 100px; width: 100%;"   once   {threshold}   {offset}   disabled="{!lazy}" >
    function create_default_slot(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let picture;
    	let source0;
    	let t2;
    	let source1;
    	let t3;
    	let img;
    	let img_src_value;
    	let img_class_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*blurhash*/ ctx[15]) return create_if_block$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			picture = element("picture");
    			source0 = element("source");
    			t2 = space();
    			source1 = element("source");
    			t3 = space();
    			img = element("img");
    			set_style(div0, "width", "100%");
    			set_style(div0, "padding-bottom", /*ratio*/ ctx[7]);
    			add_location(div0, file$2, 86, 6, 1833);
    			attr_dev(source0, "type", "image/webp");
    			attr_dev(source0, "srcset", /*srcsetWebp*/ ctx[6]);
    			attr_dev(source0, "sizes", /*sizes*/ ctx[9]);
    			add_location(source0, file$2, 93, 8, 2151);
    			attr_dev(source1, "srcset", /*srcset*/ ctx[5]);
    			attr_dev(source1, "sizes", /*sizes*/ ctx[9]);
    			add_location(source1, file$2, 94, 8, 2218);
    			if (img.src !== (img_src_value = /*src*/ ctx[4])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", img_class_value = "main " + /*c*/ ctx[0] + " " + /*className*/ ctx[17] + " svelte-u3b0c9");
    			attr_dev(img, "alt", /*alt*/ ctx[1]);
    			attr_dev(img, "width", /*width*/ ctx[2]);
    			attr_dev(img, "height", /*height*/ ctx[3]);
    			add_location(img, file$2, 95, 8, 2254);
    			add_location(picture, file$2, 92, 6, 2133);
    			set_style(div1, "position", "relative");
    			set_style(div1, "overflow", "hidden");
    			add_location(div1, file$2, 85, 4, 1775);
    			set_style(div2, "position", "relative");
    			set_style(div2, "width", "100%");
    			attr_dev(div2, "class", "svelte-u3b0c9");
    			toggle_class(div2, "loaded", /*loaded*/ ctx[18]);
    			add_location(div2, file$2, 84, 2, 1711);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			if_block.m(div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, picture);
    			append_dev(picture, source0);
    			append_dev(picture, t2);
    			append_dev(picture, source1);
    			append_dev(picture, t3);
    			append_dev(picture, img);

    			if (!mounted) {
    				dispose = action_destroyer(/*load*/ ctx[19].call(null, img));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ratio*/ 128) {
    				set_style(div0, "padding-bottom", /*ratio*/ ctx[7]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, t1);
    				}
    			}

    			if (dirty & /*srcsetWebp*/ 64) {
    				attr_dev(source0, "srcset", /*srcsetWebp*/ ctx[6]);
    			}

    			if (dirty & /*sizes*/ 512) {
    				attr_dev(source0, "sizes", /*sizes*/ ctx[9]);
    			}

    			if (dirty & /*srcset*/ 32) {
    				attr_dev(source1, "srcset", /*srcset*/ ctx[5]);
    			}

    			if (dirty & /*sizes*/ 512) {
    				attr_dev(source1, "sizes", /*sizes*/ ctx[9]);
    			}

    			if (dirty & /*src*/ 16 && img.src !== (img_src_value = /*src*/ ctx[4])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*c, className*/ 131073 && img_class_value !== (img_class_value = "main " + /*c*/ ctx[0] + " " + /*className*/ ctx[17] + " svelte-u3b0c9")) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (dirty & /*alt*/ 2) {
    				attr_dev(img, "alt", /*alt*/ ctx[1]);
    			}

    			if (dirty & /*width*/ 4) {
    				attr_dev(img, "width", /*width*/ ctx[2]);
    			}

    			if (dirty & /*height*/ 8) {
    				attr_dev(img, "height", /*height*/ ctx[3]);
    			}

    			if (dirty & /*loaded*/ 262144) {
    				toggle_class(div2, "loaded", /*loaded*/ ctx[18]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(77:0) <Waypoint   class=\\\"{wrapperClass}\\\"   style=\\\"min-height: 100px; width: 100%;\\\"   once   {threshold}   {offset}   disabled=\\\"{!lazy}\\\" >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let waypoint;
    	let current;

    	waypoint = new Waypoint({
    			props: {
    				class: /*wrapperClass*/ ctx[13],
    				style: "min-height: 100px; width: 100%;",
    				once: true,
    				threshold: /*threshold*/ ctx[11],
    				offset: /*offset*/ ctx[10],
    				disabled: !/*lazy*/ ctx[12],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(waypoint.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(waypoint, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const waypoint_changes = {};
    			if (dirty & /*wrapperClass*/ 8192) waypoint_changes.class = /*wrapperClass*/ ctx[13];
    			if (dirty & /*threshold*/ 2048) waypoint_changes.threshold = /*threshold*/ ctx[11];
    			if (dirty & /*offset*/ 1024) waypoint_changes.offset = /*offset*/ ctx[10];
    			if (dirty & /*lazy*/ 4096) waypoint_changes.disabled = !/*lazy*/ ctx[12];

    			if (dirty & /*$$scope, loaded, src, c, className, alt, width, height, srcset, sizes, srcsetWebp, blurhashSize, blurhash, placeholderClass, blur, ratio*/ 2606079) {
    				waypoint_changes.$$scope = { dirty, ctx };
    			}

    			waypoint.$set(waypoint_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waypoint.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waypoint.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(waypoint, detaching);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Image", slots, []);
    	let { c = "" } = $$props; // deprecated
    	let { alt = "" } = $$props;
    	let { width = null } = $$props;
    	let { height = null } = $$props;
    	let { src = "" } = $$props;
    	let { srcset = "" } = $$props;
    	let { srcsetWebp = "" } = $$props;
    	let { ratio = "100%" } = $$props;
    	let { blur = true } = $$props;
    	let { sizes = "(max-width: 1000px) 100vw, 1000px" } = $$props;
    	let { offset = 0 } = $$props;
    	let { threshold = 1 } = $$props;
    	let { lazy = true } = $$props;
    	let { wrapperClass = "" } = $$props;
    	let { placeholderClass = "" } = $$props;
    	let { blurhash = null } = $$props;
    	let { blurhashSize = null } = $$props;
    	let { class: className = "" } = $$props;
    	let loaded = !lazy;

    	function load(img) {
    		img.onload = () => $$invalidate(18, loaded = true);
    	}

    	function decodeBlurhash(canvas) {
    		const pixels = dist.decode(blurhash, blurhashSize.width, blurhashSize.height);
    		const ctx = canvas.getContext("2d");
    		const imageData = ctx.createImageData(blurhashSize.width, blurhashSize.height);
    		imageData.data.set(pixels);
    		ctx.putImageData(imageData, 0, 0);
    	}

    	const writable_props = [
    		"c",
    		"alt",
    		"width",
    		"height",
    		"src",
    		"srcset",
    		"srcsetWebp",
    		"ratio",
    		"blur",
    		"sizes",
    		"offset",
    		"threshold",
    		"lazy",
    		"wrapperClass",
    		"placeholderClass",
    		"blurhash",
    		"blurhashSize",
    		"class"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Image> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("c" in $$props) $$invalidate(0, c = $$props.c);
    		if ("alt" in $$props) $$invalidate(1, alt = $$props.alt);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("src" in $$props) $$invalidate(4, src = $$props.src);
    		if ("srcset" in $$props) $$invalidate(5, srcset = $$props.srcset);
    		if ("srcsetWebp" in $$props) $$invalidate(6, srcsetWebp = $$props.srcsetWebp);
    		if ("ratio" in $$props) $$invalidate(7, ratio = $$props.ratio);
    		if ("blur" in $$props) $$invalidate(8, blur = $$props.blur);
    		if ("sizes" in $$props) $$invalidate(9, sizes = $$props.sizes);
    		if ("offset" in $$props) $$invalidate(10, offset = $$props.offset);
    		if ("threshold" in $$props) $$invalidate(11, threshold = $$props.threshold);
    		if ("lazy" in $$props) $$invalidate(12, lazy = $$props.lazy);
    		if ("wrapperClass" in $$props) $$invalidate(13, wrapperClass = $$props.wrapperClass);
    		if ("placeholderClass" in $$props) $$invalidate(14, placeholderClass = $$props.placeholderClass);
    		if ("blurhash" in $$props) $$invalidate(15, blurhash = $$props.blurhash);
    		if ("blurhashSize" in $$props) $$invalidate(16, blurhashSize = $$props.blurhashSize);
    		if ("class" in $$props) $$invalidate(17, className = $$props.class);
    	};

    	$$self.$capture_state = () => ({
    		decode: dist.decode,
    		Waypoint,
    		c,
    		alt,
    		width,
    		height,
    		src,
    		srcset,
    		srcsetWebp,
    		ratio,
    		blur,
    		sizes,
    		offset,
    		threshold,
    		lazy,
    		wrapperClass,
    		placeholderClass,
    		blurhash,
    		blurhashSize,
    		className,
    		loaded,
    		load,
    		decodeBlurhash
    	});

    	$$self.$inject_state = $$props => {
    		if ("c" in $$props) $$invalidate(0, c = $$props.c);
    		if ("alt" in $$props) $$invalidate(1, alt = $$props.alt);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("src" in $$props) $$invalidate(4, src = $$props.src);
    		if ("srcset" in $$props) $$invalidate(5, srcset = $$props.srcset);
    		if ("srcsetWebp" in $$props) $$invalidate(6, srcsetWebp = $$props.srcsetWebp);
    		if ("ratio" in $$props) $$invalidate(7, ratio = $$props.ratio);
    		if ("blur" in $$props) $$invalidate(8, blur = $$props.blur);
    		if ("sizes" in $$props) $$invalidate(9, sizes = $$props.sizes);
    		if ("offset" in $$props) $$invalidate(10, offset = $$props.offset);
    		if ("threshold" in $$props) $$invalidate(11, threshold = $$props.threshold);
    		if ("lazy" in $$props) $$invalidate(12, lazy = $$props.lazy);
    		if ("wrapperClass" in $$props) $$invalidate(13, wrapperClass = $$props.wrapperClass);
    		if ("placeholderClass" in $$props) $$invalidate(14, placeholderClass = $$props.placeholderClass);
    		if ("blurhash" in $$props) $$invalidate(15, blurhash = $$props.blurhash);
    		if ("blurhashSize" in $$props) $$invalidate(16, blurhashSize = $$props.blurhashSize);
    		if ("className" in $$props) $$invalidate(17, className = $$props.className);
    		if ("loaded" in $$props) $$invalidate(18, loaded = $$props.loaded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		c,
    		alt,
    		width,
    		height,
    		src,
    		srcset,
    		srcsetWebp,
    		ratio,
    		blur,
    		sizes,
    		offset,
    		threshold,
    		lazy,
    		wrapperClass,
    		placeholderClass,
    		blurhash,
    		blurhashSize,
    		className,
    		loaded,
    		load,
    		decodeBlurhash
    	];
    }

    class Image extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			c: 0,
    			alt: 1,
    			width: 2,
    			height: 3,
    			src: 4,
    			srcset: 5,
    			srcsetWebp: 6,
    			ratio: 7,
    			blur: 8,
    			sizes: 9,
    			offset: 10,
    			threshold: 11,
    			lazy: 12,
    			wrapperClass: 13,
    			placeholderClass: 14,
    			blurhash: 15,
    			blurhashSize: 16,
    			class: 17
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Image",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get c() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set c(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alt() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alt(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get src() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get srcset() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set srcset(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get srcsetWebp() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set srcsetWebp(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ratio() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ratio(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blur() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blur(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sizes() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sizes(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offset() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offset(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get threshold() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set threshold(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lazy() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lazy(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wrapperClass() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wrapperClass(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholderClass() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholderClass(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blurhash() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blurhash(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get blurhashSize() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blurhashSize(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Image>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Image>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Trades.svelte generated by Svelte v3.32.1 */
    const file$3 = "src\\Trades.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (19:24) {#each listing.inputs as inputItem}
    function create_each_block_1(ctx) {
    	let div2;
    	let div0;
    	let a;
    	let img;
    	let img_src_value;
    	let a_href_value;
    	let t0;
    	let t1_value = /*inputItem*/ ctx[5].name + "";
    	let t1;
    	let t2;
    	let div1;
    	let t3;
    	let t4_value = /*inputItem*/ ctx[5].amount + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			t3 = text("x");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(img, "class", "self-center");
    			if (img.src !== (img_src_value = "/images" + /*inputItem*/ ctx[5].iconHref)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$3, 22, 102, 884);
    			attr_dev(a, "class", "self-center");
    			attr_dev(a, "href", a_href_value = /*gamepediaUrl*/ ctx[0] + /*inputItem*/ ctx[5].relativeHref);
    			add_location(a, file$3, 22, 36, 818);
    			attr_dev(div0, "class", "flex flex-col justify-items-center");
    			add_location(div0, file$3, 21, 32, 732);
    			attr_dev(div1, "class", "self-center ml-3");
    			add_location(div1, file$3, 27, 32, 1153);
    			attr_dev(div2, "class", "flex justify-center mb-4");
    			add_location(div2, file$3, 19, 28, 597);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, a);
    			append_dev(a, img);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div2, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$filteredListings*/ 2 && img.src !== (img_src_value = "/images" + /*inputItem*/ ctx[5].iconHref)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*gamepediaUrl, $filteredListings*/ 3 && a_href_value !== (a_href_value = /*gamepediaUrl*/ ctx[0] + /*inputItem*/ ctx[5].relativeHref)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*$filteredListings*/ 2 && t1_value !== (t1_value = /*inputItem*/ ctx[5].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$filteredListings*/ 2 && t4_value !== (t4_value = /*inputItem*/ ctx[5].amount + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(19:24) {#each listing.inputs as inputItem}",
    		ctx
    	});

    	return block;
    }

    // (14:12) {#each $filteredListings as listing}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0;
    	let td1;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let t2_value = /*listing*/ ctx[2].trader.name + "";
    	let t2;
    	let t3;
    	let td2;
    	let div3;
    	let div1;
    	let a;
    	let img1;
    	let img1_src_value;
    	let a_href_value;
    	let t4;
    	let t5_value = /*listing*/ ctx[2].output.name + "";
    	let t5;
    	let t6;
    	let div2;
    	let t7;
    	let t8_value = /*listing*/ ctx[2].output.amount + "";
    	let t8;
    	let t9;
    	let each_value_1 = /*listing*/ ctx[2].inputs;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			td1 = element("td");
    			div0 = element("div");
    			img0 = element("img");
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			div3 = element("div");
    			div1 = element("div");
    			a = element("a");
    			img1 = element("img");
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			div2 = element("div");
    			t7 = text("x");
    			t8 = text(t8_value);
    			t9 = space();
    			attr_dev(td0, "class", "border-2 border-color p-5 w-1/6 svelte-b2iufc");
    			add_location(td0, file$3, 17, 20, 462);
    			attr_dev(img0, "class", "self-center");
    			if (img0.src !== (img0_src_value = "/images" + /*listing*/ ctx[2].trader.iconHref)) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$3, 37, 28, 1597);
    			attr_dev(div0, "class", "flex flex-col justify-items-center");
    			add_location(div0, file$3, 36, 24, 1519);
    			attr_dev(td1, "class", "border-2 border-color p-5 w-1/6 svelte-b2iufc");
    			add_location(td1, file$3, 35, 20, 1449);
    			attr_dev(img1, "class", "self-center");
    			if (img1.src !== (img1_src_value = "/images" + /*listing*/ ctx[2].output.iconHref)) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$3, 47, 103, 2208);
    			attr_dev(a, "class", "self-center");
    			attr_dev(a, "href", a_href_value = /*gamepediaUrl*/ ctx[0] + /*listing*/ ctx[2].output.relativeHref);
    			add_location(a, file$3, 47, 32, 2137);
    			attr_dev(div1, "class", "flex flex-col justify-items-center");
    			add_location(div1, file$3, 46, 28, 2055);
    			attr_dev(div2, "class", "self-center ml-3");
    			add_location(div2, file$3, 52, 28, 2471);
    			attr_dev(div3, "class", "flex flex justify-center");
    			add_location(div3, file$3, 44, 24, 1928);
    			attr_dev(td2, "class", "border-2 border-color p-5 w-1/6 svelte-b2iufc");
    			add_location(td2, file$3, 43, 20, 1858);
    			attr_dev(tr, "class", "border-2 text-svelte");
    			add_location(tr, file$3, 14, 16, 351);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(td0, null);
    			}

    			append_dev(tr, t0);
    			append_dev(tr, td1);
    			append_dev(td1, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, div3);
    			append_dev(div3, div1);
    			append_dev(div1, a);
    			append_dev(a, img1);
    			append_dev(div1, t4);
    			append_dev(div1, t5);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, t7);
    			append_dev(div2, t8);
    			append_dev(tr, t9);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$filteredListings, gamepediaUrl*/ 3) {
    				each_value_1 = /*listing*/ ctx[2].inputs;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(td0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty & /*$filteredListings*/ 2 && img0.src !== (img0_src_value = "/images" + /*listing*/ ctx[2].trader.iconHref)) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*$filteredListings*/ 2 && t2_value !== (t2_value = /*listing*/ ctx[2].trader.name + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*$filteredListings*/ 2 && img1.src !== (img1_src_value = "/images" + /*listing*/ ctx[2].output.iconHref)) {
    				attr_dev(img1, "src", img1_src_value);
    			}

    			if (dirty & /*gamepediaUrl, $filteredListings*/ 3 && a_href_value !== (a_href_value = /*gamepediaUrl*/ ctx[0] + /*listing*/ ctx[2].output.relativeHref)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*$filteredListings*/ 2 && t5_value !== (t5_value = /*listing*/ ctx[2].output.name + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*$filteredListings*/ 2 && t8_value !== (t8_value = /*listing*/ ctx[2].output.amount + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(14:12) {#each $filteredListings as listing}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let main;
    	let table;
    	let tbody;
    	let each_value = /*$filteredListings*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			table = element("table");
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(tbody, file$3, 12, 8, 276);
    			add_location(table, file$3, 11, 4, 259);
    			attr_dev(main, "class", "p-4 mx-auto text-center w-4/6");
    			add_location(main, file$3, 10, 0, 209);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, table);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$filteredListings, gamepediaUrl*/ 3) {
    				each_value = /*$filteredListings*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
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
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
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
    		Image,
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { gamepediaUrl: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trades",
    			options,
    			id: create_fragment$4.name
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
    const file$4 = "src\\Search.svelte";

    function create_fragment$5(ctx) {
    	let main;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			input = element("input");
    			attr_dev(input, "class", "text-gray-400 bg-gray-800 rounded mt-5 mb-5 pl-1 pr-1 pt-1 pb-1 w-80");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search Here");
    			add_location(input, file$4, 15, 4, 495);
    			add_location(main, file$4, 14, 0, 483);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
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
    				console.log($filteredListings);
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const durationUnitRegex = /[a-zA-Z]/;

    const range = (size, startAt = 0) =>
      [...Array(size).keys()].map(i => i + startAt);

    /* node_modules\svelte-loading-spinners\src\Jumper.svelte generated by Svelte v3.32.1 */
    const file$5 = "node_modules\\svelte-loading-spinners\\src\\Jumper.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (45:2) {#each range(3, 1) as version}
    function create_each_block$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "circle svelte-vcw43z");
    			set_style(div, "animation-delay", /*durationNum*/ ctx[5] / 3 * (/*version*/ ctx[6] - 1) + /*durationUnit*/ ctx[4]);
    			add_location(div, file$5, 45, 4, 918);
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
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(45:2) {#each range(3, 1) as version}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let each_value = range(3, 1);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
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
    			add_location(div, file$5, 43, 0, 785);
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
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { size: 0, color: 1, unit: 2, duration: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jumper",
    			options,
    			id: create_fragment$6.name
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
    const file$6 = "src\\App.svelte";

    // (39:1) {:else}
    function create_else_block$2(ctx) {
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
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(39:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (35:1) {#if $listings.length <= 0}
    function create_if_block$3(ctx) {
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
    			add_location(div, file$6, 35, 2, 1637);
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
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(35:1) {#if $listings.length <= 0}",
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
    	let current_block_type_index;
    	let if_block;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	search = new Search({ $$inline: true });
    	const if_block_creators = [create_if_block$3, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$listings*/ ctx[1].length <= 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Barter Buddy";
    			t2 = space();
    			h2 = element("h2");
    			h2.textContent = "A Barter Searcher for Tarkov";
    			t4 = space();
    			br0 = element("br");
    			br1 = element("br");
    			t5 = space();
    			create_component(search.$$.fragment);
    			t6 = space();
    			if_block.c();
    			attr_dev(h1, "class", "uppercase text-6xl leading-normal font-thin text-svelte");
    			add_location(h1, file$6, 27, 1, 1055);
    			attr_dev(h2, "class", "text-2xl leading-normal font-thin text-svelte");
    			add_location(h2, file$6, 28, 1, 1142);
    			add_location(br0, file$6, 29, 1, 1235);
    			add_location(br1, file$6, 29, 5, 1239);
    			attr_dev(main, "class", "p-4 mx-auto w-5/6 text-center");
    			add_location(main, file$6, 26, 0, 1009);
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
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
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
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(search.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(search.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(search);
    			if_blocks[current_block_type_index].d();
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

    const baseUrl = "/escapefromtarkov.gamepedia.com";
    const ammoUrl = "/Ammunition";
    const barterUrl$1 = "/escapefromtarkov.gamepedia.com/Barter_trades";

    function instance$7($$self, $$props, $$invalidate) {
    	let $listings;
    	let $filteredListings;
    	validate_store(listings, "listings");
    	component_subscribe($$self, listings, $$value => $$invalidate(1, $listings = $$value));
    	validate_store(filteredListings, "filteredListings");
    	component_subscribe($$self, filteredListings, $$value => $$invalidate(3, $filteredListings = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const corsRedirect = "https://cors-anywhere.herokuapp.com";
    	const gamepediaUrl = "https://escapefromtarkov.gamepedia.com";
    	console.log("Test");

    	// ParseAmmo.Parse(corsRedirect+baseUrl+ammoUrl);
    	// This actuall works but it wants to complain
    	document.body.classList = [];

    	ParseAmmo.GetBartersAndCrafts().then(data => {
    		set_store_value(listings, $listings = data, $listings);
    		set_store_value(filteredListings, $filteredListings = data, $filteredListings);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ModeSwitcher,
    		ParseAmmo,
    		Tailwindcss,
    		Trades,
    		Search,
    		listings,
    		filteredListings,
    		Jumper,
    		corsRedirect,
    		gamepediaUrl,
    		baseUrl,
    		ammoUrl,
    		barterUrl: barterUrl$1,
    		$listings,
    		$filteredListings
    	});

    	return [gamepediaUrl, $listings, corsRedirect];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { corsRedirect: 2, gamepediaUrl: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get corsRedirect() {
    		return this.$$.ctx[2];
    	}

    	set corsRedirect(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
