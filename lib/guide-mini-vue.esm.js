function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
const isString = (value) => {
    return typeof value === 'string';
};
const hasChange = (value, newValue) => {
    return !Object.is(value, newValue);
};
//第一位大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
//将 aaa-bbb 的格式变为 aaaBbb
const camelize = (str) => {
    // _ 代表的是 - 以及 - 后的第一位，即 -b
    // c 代表的是 - 后的第一位, 即 b
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
//是否存在，存在则添加上 on
const toHandlerKey = (str) => {
    return str ? 'on' + capitalize(str) : '';
};

//获取ReactiveEffect实例对象
let activeEffect;
//判断是否需要进行依赖收集
let shouldTrack = false;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = []; //此次effect所涉及的对象属性的属性地图
        /**
         * 用于判断使用stop()时是否需要清空数据，true为需要。
         * *也是作为是否调用了stop()的标识，值为false时，则肯定是调用了stop
         */
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    //调用传入的fn
    run() {
        activeEffect = this;
        /**
         * 因为在run()内调用this._fn()，会触发reactive的get，而get内会进行依赖收集
         * 故在此处做stop后禁止依赖收集的控制
         */
        //当active为false时，说明已经调用了stop()，因为shouldTrack为false，直接返回不触发依赖收集
        if (!this.active) {
            return this._fn();
        }
        //当active为true，将shouldTrack变为true，允许依赖收集
        shouldTrack = true;
        const result = this._fn();
        shouldTrack = false;
        return result;
    }
    stop() {
        //active起到标识作用，第一次执行后则变为false，避免重复执行浪费资源
        if (this.active) {
            //清空依赖
            cleanupEffect(this);
            //如果存在onStop，则执行
            if (this.onStop)
                this.onStop();
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    // 遍历并清空每个依赖
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
//对象地图，是总的依赖对象
let targetMap = new Map();
/**
 * 实现依赖收集
 * 每个对象的每个key都需要有一个依赖收集的容器(dep)
 * 容器的对应关系如下：总对象地图(targetMap) -> 对象地图(depsMap) -> 属性地图(depSet)
 * @param target 对象
 * @param key 键名
 */
function track(target, key) {
    if (!isTracking())
        return;
    //通过对象地图获取key地图
    let depsMap = targetMap.get(target);
    //如果对象地图中不存在key地图，则新增一个空的key地图存入
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    //获取容器
    let dep = depsMap.get(key);
    // 如果没有则新增一个空Set，并存入
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffect(dep);
}
function trackEffect(dep) {
    if (dep.has(activeEffect))
        return;
    //将ReactiveEffect实例传入dep中
    dep.add(activeEffect);
    //在实例内保存了此次effect所涉及的对象属性的属性地图
    activeEffect.deps.push(dep);
}
// 用于判断是否可以tracking
function isTracking() {
    // 当不存在activeEffect实例对象，也就是数据只reactive但没有effect时，返回，不去收集依赖
    // if (!activeEffect) return
    // 当使用stop的情况后，shouldTrack变为false，不去收集依赖
    // if(!shouldTrack) return
    // *如下代码是对如上代码的合并
    return shouldTrack && activeEffect !== undefined;
}
/**
 * 实现触发依赖
 * 基于target和key，取出dep对象，去遍历并调用所有的收集的fn
 * @param target 对象
 * @param key 键名
 */
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    const dep = depsMap.get(key);
    triggerEffect(dep);
}
function triggerEffect(dep) {
    //执行fn
    for (const effect of dep) {
        //当发生更新时，如果存在 scheduler 则触发 scheduler
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    extend(_effect, options); //extend为Object.assign的封装
    _effect.run();
    //bind()能将函数内的this指针指向bind()内的参数
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, isShallow = false) {
    return function get(target, key) {
        //判断isReactive和isReadonly使用，当key为特定值时，返回响应布尔值
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        /**
         * Reflect.get(target, key)
         * target: 对象
         * key: 键名
         * 获取对象上某个属性的值。类似target[key]
         */
        const res = Reflect.get(target, key);
        //如何是shallow，就直接返回属性值。
        if (isShallow)
            return res;
        //进行多层判断
        if (isObject(res)) {
            //如果取的是响应式的属性值是对象的话，则再给这个对象加上响应式。
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            // TODO 依赖收集
            track(target, key);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        /**
         * Reflect.set(target, key, value)
         * target: 对象
         * key: 键名
         * value: 值
         * 为对象设置属性，返回一个boolean，更新成功则返回true
         */
        const res = Reflect.set(target, key, value);
        // TODO 触发依赖
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn('readonly, 无法进行set', target);
        return true;
    },
};
const shallowReadyonlyHandlers = extend({}, readonlyHandlers, { get: shallowReadonlyGet });

//实现reactive
function reactive(raw) {
    /**
     * Proxy: Proxy对象用于创建对象的一个代理，从而实现基础操作的拦截和自定义
     * 使用：const p = new proxy(target, handler)
     * target: 要包装的目标对象（可以是任何类型的对象，包括原生数组，函数，甚至另一个代理）
     * handler: 一个通常以函数作为属性的对象，各属性中的函数分别定义了在执行各种操作时代理 p 的行为。
     */
    return createReactiveObject(raw, mutableHandlers);
}
//readonly
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadyonlyHandlers);
}
//reactive和readonly的整合
function createReactiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target ${target} 必须是一个对象`);
    }
    return new Proxy(target, baseHandlers);
}

/**
 * ref和reactive的区别：ref进来的多数为单值
 * 如何去拦截值类型的get和set？通过对象去包裹，这里通过RefImpt类去包裹。
 * 这也是为什么值类型需要用ref去包裹，需要 .value 的程序设计
 */
class RefImpt {
    constructor(value) {
        this.__v_isRef = true; //判断isRef使用
        this._value = convert(value);
        this._rawValue = value;
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        //如果赋值的新参数和旧参数一致，则不修改。
        if (hasChange(this._rawValue, newValue)) {
            this._value = convert(newValue);
            this._rawValue = newValue;
            //赋值新参数后，触发依赖
            triggerEffect(this.dep);
        }
    }
}
//判断传入的是否为对象，如果是对象则给对象进行reactive
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    //如果有effect，存在ReactiveEffect实例，才执行依赖收集，否则直接返回值
    if (isTracking()) {
        trackEffect(ref.dep);
    }
}
function ref(value) {
    return new RefImpt(value);
}
function isRef(ref) {
    //如果是一个ref对象，则存在该参数
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
//当我们把ref对象在 template 内使用时，不需要再 .value ,proxyRef 就是做了这样的工作
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            //如果该属性值是ref对象并且set的值不是，则只替换掉 .value 的值
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                // 其他情况一律直接替换
                return Reflect.set(target, key, value);
            }
        },
    });
}

/**
 * 实现 emit 方法
 * ...args 是将用户输入的 emit 第一个 event 参数后的后续参数全收集起来
 * emit 函数第一位是 event 方法名，后续参数都为方法的输入参数
 */
function emit(instance, event, ...args) {
    //处理 emit 输入的 event 名称，获得 on+Event
    const handlerName = toHandlerKey(camelize(event));
    const handler = instance.props[handlerName];
    handler && handler(...args);
}

//处理props
function initProps(instance, rawProps) {
    //对父级传入的props进行挂载，如果未传入props，则挂载一个空对象
    instance.props = rawProps || {};
}

//特定的参数
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
//代理，为能通过 this 直接调用到 setup 和 props 的值或输入特定的参数返回对应的数据使用
const publicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
        if (hasOwn(setupState, key)) {
            //如果 setup() 内存在该值，则返回
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            //如果 props() 内存在该值，则返回
            return props[key];
        }
        //是否传入的是特定的参数名，是的话返回对应的值
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

//处理插槽
function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlags & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    //循环 children 对象，为 instance 的 slots 赋值。
    for (const key in children) {
        const value = children[key];
        //因为作用域插槽需要传 props ，此处写成方法。
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
//判断是否为数组，不是则转为数组
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

//全局变量，用于赋值内部组件实例
let currentInstance = null;
//组件对象实例
function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        emit: () => { },
        parent,
        provides: parent ? parent.provides : {},
        isMounted: false,
        subTree: {},
        next: null, // 接下来要更新的虚拟节点
    };
    /**
     * 绑定 emit 函数
     * bind() 函数第一位绑定 this ，第二位绑定第一个参数
     * 这里固定第一个参数是组件虚拟节点，这样用户只需要输入 event 参数即可
     */
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    //这里拿到createApp(App)传入的App参数
    const Component = instance.type;
    //绑定一个proxy代理，这是给后续能通过 this 直接调用 setup() 内返回的值准备
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);
    //获取其中的setup
    const { setup } = Component;
    if (setup) {
        /**
         * 赋值全局变量内部组件实例
         * 为什么在这里赋值？因为 currentInstance 的值需要随着不同的组件变化，故在 setup 之前赋值最稳妥
         */
        setCurrentInstance(instance);
        /**
         * setup() 会返回 function 或者 object
         * 返回 function：是组件的 runner 函数
         * 返回 object：会把这个对象注入到当前组件的上下文中
         * 在 setup() 函数内输入 props 作为参数，使 setup() 内能使用 props 传入的值
         */
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        //赋值完后重置
        setCurrentInstance(null);
        //对返回值进行处理
        handleSetupResult(instance, setupResult);
    }
}
//处理setupResult
function handleSetupResult(instance, setupResult) {
    //TODO function
    // 将 setup() 的返回值如果是对象，就把该对象挂载到组件对象实例上，这样 render() 中就可以调用到
    if (typeof setupResult === 'object') {
        // 嵌套 proxyRefs 的原因：
        // 如果 setup() 内的数据里有 ref 对象，通过 proxyRefs() 嵌套后不需要 .value 来取值。
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    // 拿到createApp(App)传入的App参数
    const Component = instance.type;
    // 将参数内需要生成的虚拟节点的函数挂载到组件对象实例上
    // 走 template 转 render 函数需要 compiler 存在以及 Component.render 不存在。
    // 因为如果 Component.render 存在，则优先级是最高的。就直接赋值 Component.render 了
    if (compiler && !Component.render) {
        // 存在 Component.template 才能进行转换
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
//输出内部组件实例，也是官方接口
function getCurrentInstance() {
    return currentInstance;
}
//对全局内部组件实例进行赋值
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
// 获得 template 转 render 的函数
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

//创建插槽渲染 children 虚拟节点的唯一标识。
const Frangment = Symbol('Frangment');
//创建插槽渲染只输入文字的唯一标识
const Text = Symbol('Text');
/**
 * 创建虚拟节点
 * @param type 要生成节点的对象，内包含 render() 等
 * @param props
 * @param children
 * @returns
 */
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        key: props && props.key,
        el: null,
        shapeFlags: getShapeFlags(type),
        component: null, // 当前虚拟节点的组件实例对象
    };
    // 通过运算符的 | 的用法，进行赋值。这里赋值 children 的类型
    if (typeof vnode.children === 'string') {
        vnode.shapeFlags |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(vnode.children)) {
        vnode.shapeFlags |= 8 /* ARRATY_CHILDREN */;
    }
    //判断是否存在插槽，条件：是组件虚拟对象节点并且其 children 是一个对象类型
    if (vnode.shapeFlags & 2 /* STATEFUL_COMPONENT */) {
        if (typeof vnode.children === 'object') {
            vnode.shapeFlags |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
//先赋上值，这里返回的是当前虚拟节点的类型
function getShapeFlags(type) {
    return typeof type === 'string'
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}
// 创建只输入文字的虚拟节点
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

//闭包，返回之前的 createApp
function createAppApi(render) {
    /**
     * 文档解释：返回一个提供应用上下文的应用实例。应用实例挂载的整个组件树共享同一个上下文
     * @param rootComponent 根组件，传入的是要生成节点的对象，组件对象，内包含 render() 等
     */
    return function createApp(rootComponent) {
        return {
            /**
             * 文档解释：所提供 DOM 元素的 innerHTML 将被替换为应用根组件的模板渲染结果
             * @param rootContainer 根容器，当前传入的是 element 对象
             */
            mount(rootContainer) {
                //这里会将输入的组件转换为vnode(虚拟节点)
                //后续所有操作都基于 vnode
                //将组件转化为虚拟节点
                const vnode = createVNode(rootComponent);
                //处理虚拟节点并生成到页面
                render(vnode, rootContainer);
            },
        };
    };
}

// 判断组件是否需要更新
function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    // 循环比较，如果出现不相等的 props ，说明需要更新
    for (const key in nextProps) {
        if (prevProps[key] !== nextProps[key]) {
            return true;
        }
    }
    return false;
}

// 储存 effect.update 的数组
const queue = [];
// 一个标识，由于会走 queueFlush 函数，避免创建多个 Promise 对象。使用该标识进行判断。
let isFlushPending = false;
const p = Promise.resolve();
/**
 * 防止触发重复的更新，造成资源浪费
 * 该函数会将所有对页面的渲染更新(effect触发)保存起来，放入异步中。等到同步执行完毕再开始页面的渲染更新。
 * @param job 需要保存执行的 effect.update
 */
function queueJobs(job) {
    // 排除重复的更新
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
// 创建异步执行
function queueFlush() {
    // 标识为 true ，说明本次操作已经创建了一个 Promise ，直接返回。
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(() => {
        // 重置标识
        isFlushPending = false;
        let job;
        // shift() 会删除数组的第一个值，并 return 出去。这里将每个存储的 effect.update 一一取出并执行。
        while ((job = queue.shift())) {
            job && job();
        }
    });
}
// nextTick 本质也是将回调函数丢入到微任务中。
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}

/**
 * 将 renderer 封装成一个闭包，方便扩展。
 * 目前是为了 createRenderer 自定义渲染器，方便渲染到不同的环境下，例如：dom 下或 canvas 下。
 * @param options 包含的扩展配置,可以直接通过该参数去自定义配置，以达成不同的环境的需求。
 * @returns
 */
function createRenderer(options) {
    const { createElement: hostCreateELement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementhost: hostSetElementText, } = options;
    /**
     * render只调用patch方法，方便后续递归的处理
     * @param vnode 虚拟节点
     * @param container 容器
     */
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    /**
     *
     * @param n1 旧的虚拟节点
     * @param n2 现在的虚拟节点
     * @param container
     * @param parentComponent
     */
    function patch(n1, n2, container, parentComponent, anthor) {
        //判断传入的是要生成 element 的对象还是，组件对象(包含render等)
        //要生成 element 的对象，type是要生成的虚拟节点的 html 标签类型，是字符串
        const { type, shapeFlags } = n2;
        //判断类型是否是特定的参数类型，如果是则走特定的方法，否者走正常的组件或 element 判断。
        switch (type) {
            case Frangment:
                processFrangment(n1, n2, container, parentComponent, anthor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlags & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anthor);
                }
                else if (shapeFlags & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anthor);
                }
                break;
        }
    }
    //处理组件
    function processComponent(n1, n2, container, parentComponent, anthor) {
        if (!n1) {
            // 挂载组件
            mountComponent(n2, container, parentComponent, anthor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        // 获取现在的组件对象实例, 并将它复制到 n2 中
        const instance = (n2.component = n1.component);
        // 判断是否需要进行更新，因为有时候父组件更新并未更新到该子组件
        if (shouldUpdateComponent(n1, n2)) {
            // 将接下来要更新的虚拟节点赋值到组件对象实例的 next 属性上
            instance.next = n2;
            // effect 返回 render 函数，调用 render 函数实际就是跑一遍传入的回调函数，触发更新
            instance.update();
        }
        else {
            n2.el = n1.el;
        }
    }
    //挂载组件
    function mountComponent(initialVNode, container, parentComponent, anthor) {
        //创建组件对象实例，存储组件的一些必要的属性
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, initialVNode, container, anthor);
    }
    function setupRenderEffect(instance, initialVNode, container, anthor) {
        /**
         * 因为生成 element 对象并进行 DOM 渲染时，会调用到 instance.render。
         * 而需要页面更新的页面内，render 内必然会使用到 setup 内定义的响应式的变量。
         * 所以通过 effect 包裹，即可在响应式变量改变时，重新去触发生成 element 对象和操作 DOM ，实现页面的响应式更新。
         */
        instance.update = effect(() => {
            // 判断是否是初始化
            if (!instance.isMounted) {
                //初始化
                /**
                 * 开箱，获取到组件内部的虚拟节点树
                 * 此处通过 call() ，将 this 指向 instance.proxy ，目的是为了能通过 this 直接调用 setup() 返回的值
                 */
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                //第四个参数传入父组件的实例对象
                patch(null, subTree, container, instance, anthor);
                //将虚拟节点树生成的 element 对象绑定到组件虚拟节点上
                initialVNode.el = subTree.el;
                //初始化结束，isMounted 改为 true
                instance.isMounted = true;
            }
            else {
                //更新
                // 取出下次要更新的组件对象实例 next ，和现在的虚拟节点
                const { next, vnode } = instance;
                // 如果下次要更新的组件对象实例存在，则进入更新
                if (next) {
                    next.el = vnode.el;
                    // 更新组件
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                // 生成本次的虚拟节点树
                const subTree = instance.render.call(proxy, proxy);
                // 获取前一次的虚拟节点树
                const prevSubTree = instance.subTree;
                // 将本次生成的虚拟节点树替换
                instance.subTree = subTree;
                // 因为需要检测更新，对新旧虚拟节点树做对比，所以 patch 函数内将新旧虚拟节点树都传入
                patch(prevSubTree, subTree, container, instance, anthor);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
    }
    // 更新组件
    function updateComponentPreRender(instance, nextVNode) {
        // 替换组件对象实例上虚拟节点
        instance.vnode = nextVNode;
        // 赋值完了，将 next 清空
        instance.next = null;
        // 将 props 赋值过去
        instance.props = nextVNode.props;
    }
    //处理 element
    function processElement(n1, n2, container, parentComponent, anthor) {
        if (!n1) {
            //初始化
            mountElement(n2, container, parentComponent, anthor);
        }
        else {
            //更新 element
            patchElement(n1, n2, container, parentComponent, anthor);
        }
    }
    //处理更新
    function patchElement(n1, n2, container, parentComponent, anthor) {
        console.log('#element update');
        /**
         * props 修改
         */
        // 获取新旧 props
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 将 n1 的 el 挂载到新的 n2 上
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
        /**
         * children 修改
         */
        patchChildren(n1, n2, el, parentComponent, anthor);
    }
    // 更新虚拟 DOM ,处理 children
    function patchChildren(n1, n2, container, parentComponent, anthor) {
        const prevShapeFlags = n1.shapeFlags;
        const nextShapeFlages = n2.shapeFlags;
        const c1 = n1.children;
        const c2 = n2.children;
        // 判断新的虚拟节点的 children 是否为文本
        if (nextShapeFlages & 4 /* TEXT_CHILDREN */) {
            // text to text 、text to array
            // 判断旧的虚拟节点的 children 是否为数组
            if (prevShapeFlags & 8 /* ARRATY_CHILDREN */) {
                // 卸载旧的
                unmountedChildren(n1.children);
            }
            // 这里的判断主要是为了 text 与 text 的判断, 因为数组和 text 一定为 true。 所以重构写到了一起。
            if (c1 !== c2) {
                // 添加新的
                hostSetElementText(container, n2.children);
            }
        }
        else {
            if (prevShapeFlags & 4 /* TEXT_CHILDREN */) {
                // array to text
                hostSetElementText(container, '');
                mountChildren(n2.children, container, parentComponent, anthor);
            }
            else {
                // array to array
                patchKeyedChildren(c1, c2, container, parentComponent, anthor);
            }
        }
    }
    // 处理新旧都是数组的情况，使用 diff 算法
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnthor) {
        //#region 锁定需要修改的位置区域
        // 创建标记
        // i 从新旧数组的第一位开始，向后移动。而 e1、e2 代表新旧数组的最后一位，操作时向前移动。
        let i = 0;
        const l2 = c2.length;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        // 判断是否是相同的虚拟节点
        function isSameVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 正向检索，通过 i++ 去找到新旧数组前面相同的位数
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnthor);
            }
            else {
                break;
            }
            i++;
        }
        // 反向检索，通过 e1,e2 的值找到尾部相同的位数
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnthor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        //#endregion
        // 下方的两端处理和中间处理是 if else 关系，是根据上面导出的 i e1 e2 之间的大小判断的。
        //#region 处理数组两端和前者相比多出的或少了的 if
        // 当进行完上面的循环，i 小于等于 e2，大于 e1 则新的数组比老的数组长，需要新增
        if (i > e1) {
            if (i <= e2) {
                //找到锚点 anthor，要插入的数据就插入到该锚点之前，如果数据是向后添加的，则锚点为 null
                const nextPos = e2 + 1;
                const anthor = nextPos < l2 ? c2[nextPos].el : null;
                //i 和 e2 差了几位，则就是新增了几个，所以循环遍历，知道 i 与 e2 相等
                while (i <= e2) {
                    // 调用 patch ，最终会在 mountElement 函数的 hostInsert 中进行新增
                    patch(null, c2[i], container, parentComponent, anthor);
                    i++;
                }
            }
        }
        // 同理，当 i 大于 e2，小于等于 e1 时，则老的数组比新的数组长，需要删除
        else if (i > e2) {
            while (i <= e1) {
                // 删除操作
                hostRemove(c1[i].el);
                i++;
            }
        }
        //#endregion
        //#region 处理其他复杂的情况，例：中间不同两端相同，多处变动等 else
        // 处理两端相同中间不同的
        else {
            // 下方遍历使用的标记
            const s1 = i;
            const s2 = i;
            // 新的数组中修改区域的长度
            const toBePatched = e2 - s2 + 1;
            // 记录更新了多少个，每次在 patch 更新后都自增长，一旦它的值与 toBePatched 相等，则说明 dom 更新完毕。
            let patched = 0;
            /**
             * 新老数组内虚拟节点的对应关系, 默认全为 0
             * 只有新旧数组都有的虚拟节点才有值，倘若是新增的则 value 为 0
             * key-value: 新数组需要修改的区域虚拟节点的顺序 - 当前新数组虚拟节点在老数组中的位置
             */
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            // 是否需要进行虚拟节点移动, true 为需要
            let moved = false;
            // 在循环时记录上一位虚拟节点的位置，用于确认是否将 moved 改为 true
            let maxNewIndexSoFar = 0;
            // 创建一张新数组的映射地图，映射地图包含的部分是新的与旧的不同的部分。
            const keyToNewIndexMap = new Map();
            // 将需要修改的区域的每个虚拟节点，用 key 与 位置 i 联系到一起，存入映射地图
            for (i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 循环旧数组，开始对数据进行处理
            for (i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                if (patched >= toBePatched) {
                    // 如果两值相等，说明新的数组包含的 DOM 数据更新已经完成，所以旧数组剩下的全都进行删除
                    hostRemove(prevChild.el);
                    continue;
                }
                // 代表本次循环的单个虚拟节点如果存在在新的数组中，其位置标识是多少
                let newIndex;
                if (!!prevChild.key) {
                    // 如果存在虚拟节点存在 key 则从映射地图中取值并赋值。
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 如果不存在 key 则去循环新的数组查找
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVnodeType(prevChild, c2[j])) {
                            newIndex = j;
                        }
                    }
                }
                if (!newIndex) {
                    // 倘若不存在 newIndex ，说明新数组中不存在该虚拟节点，将该虚拟节点对应的 element 标签对象删除
                    hostRemove(prevChild.el);
                }
                else {
                    /**
                     * 判断现在的位置是否大于上一位。倘若无需移动，则现在的位置绝对大于上一位的位置。
                     */
                    if (newIndex > maxNewIndexSoFar) {
                        // 倘若是的则把现在的位置赋值给标记
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        // 证明有移动
                        moved = true;
                    }
                    /**
                     * 对新旧数组的对应关系赋值
                     * 为什么要 i + 1 ？因为可能出现赋值的 i 是 0 (第一位)的情况，这会与其他是 0 (新增的)搞混，所以都 +1
                     * 为什么 newIndex - s2 ? 因为 newIndex 内计算的位数还包含了新数组不变的 s2 长度，所以要减去那一部分的长度
                     */
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    // 对已存在的进行替换，倘若存在则传入 patch，然后通过 patchElement 函数再去处理他们的 props 和 children
                    // 注意：此处并未操作移动，只是替换了标签内的 attribute
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            /**
             * 新增和移动 DOM 元素
             */
            // 获取无需移动的虚拟节点的位置, 让若 moved 为 false ，则给个空数组
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            // 长度计数，用于下面循环调用时，判断无需移动的虚拟节点是否全循环到了
            let j = increasingNewIndexSequence.length - 1;
            // 循环新数组需要修改区域的长度的次数
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 确认锚点,因为反向循环，所以我们从需要变动区域后面的第一位无需变动的虚拟节点开始，一位一位往前设置锚点。
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anthor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                // 倘若值为 0 说明是需要新增的新虚拟节点
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anthor);
                }
                else if (moved) {
                    // 如果 j 小于 0 ，说明无需移动位置的全执行完了，后续的全都是需要移动位置的
                    // 如果 i 不与 increasingNewIndexSequence 数组中对应，说明是需要移动的
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        // 需要移动的虚拟节点进行添加
                        hostInsert(nextChild.el, container, anthor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
        //#endregion
    }
    // 卸载是数组的 children
    function unmountedChildren(children) {
        // 循环 children 数组,将一个个 children 的 element 对象传入 hostRemove 进行卸载
        for (const key in children) {
            const el = children[key].el;
            hostRemove(el);
        }
    }
    //处理 props
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            // 循环新的 props
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                // 如果新旧值不相等，则修改
                if (prevProp !== nextProp) {
                    // 修改调用之前封装的设置 props 的方法。
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
        }
        if (oldProps !== EMPTY_OBJ) {
            // 循环旧的 props ，将新的 props 内没有的删除
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null);
                }
            }
        }
    }
    //挂载 element
    function mountElement(vnode, container, parentComponent, anthor) {
        //此处的 vnode 是虚拟节点树的
        const el = (vnode.el = hostCreateELement(vnode.type));
        //vnode.children 包含该标签内的内容
        const { shapeFlags, children } = vnode;
        if (shapeFlags & 4 /* TEXT_CHILDREN */) {
            //如果是字符串类型则直接传入
            el.textContent = children;
        }
        else if (shapeFlags & 8 /* ARRATY_CHILDREN */) {
            //如果是数组类型，说明内部还有子节点标签，递归去添加子节点标签
            mountChildren(vnode.children, el, parentComponent, anthor);
        }
        //vnode.props 包含 html 元素的 attribute、prop和事件等
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            //配置 attribute
            hostPatchProp(el, key, null, val);
        }
        //添加到主容器
        hostInsert(el, container, anthor);
    }
    //递归循环 children
    function mountChildren(children, container, parentComponent, anthor) {
        children.forEach((item) => {
            patch(null, item, container, parentComponent, anthor);
        });
    }
    //只渲染 children 虚拟节点，插槽使用。需根据输入的特定参数。
    function processFrangment(n1, n2, container, parentComponent, anthor) {
        //调用循环 children 的函数
        mountChildren(n2.children, container, parentComponent, anthor);
    }
    //当只有文字时，通过 dom 操作直接生成，并添加到容器内
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    return {
        // 导出 createApp
        createApp: createAppApi(render),
    };
}
/**
 * 最长递增子序列(不考察但是需要理解该算法在 diff 算法的作用)
 * 通过传入的数组，输出正向排布的不需要变动位置的数组
 * 例如：[2, 3, 0, 5, 6, 9] -> [ 0, 1, 3, 4, 5 ]
 * 上面例子代表：原数组的第 0, 1, 3, 4, 5 位是正向增长的，无需移动位置
 * @param arr
 * @returns
 */
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

/**
 * 执行指定名称的插槽和作用域插槽
 * @param slots 总插槽对象
 * @param name 执行的插槽名称
 * @param props 传递的作用域插槽的参数，作用域插槽使用
 * @returns
 */
function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (typeof slot === 'function') {
        return h(Frangment, {}, slot(props));
    }
}

function provider(key, value) {
    //获取组件实例对象
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        //获取父组件实例对象
        const parentProvides = currentInstance.parent.provides;
        /**
         * 这里是初始化用
         * 因为 provides 默认初始值是其父组件的 provides
         * 故如果父子的 provides 相同，说明子组件当前的 provides 还未初始化
         */
        if (provides === parentProvides) {
            /**
             * 此处解构赋值的 provides 其实只是为了之后书写快捷方便使用，故不要被误解，本质看 currentInstance.provides
             * Object.create(proto) 能返回一个新的对象，而参数 proto 绑定到其原型对象上
             * 这样就可以让多级连通，子级可以通过原型链向上访问。
             */
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    const { provides } = currentInstance.parent;
    //如果存在这个 provides 属性则返回返回值，不存在则返回输入的默认值
    if (key in provides) {
        return provides[key];
    }
    else {
        if (typeof defaultValue === 'function') {
            return defaultValue();
        }
        return defaultValue;
    }
}

// 创建 DOM
const createElement = (type) => {
    return document.createElement(type);
};
/**
 * 对 DOM 元素的 attribute、prop 和事件等进行配置
 * @param el 容器
 * @param key
 * @param oldVal 旧的 val
 * @param newVal 新的 val
 */
const patchProp = (el, key, oldVal, newVal) => {
    // 判断是否是特定的事件名称：on + Event(注意事件名首字母大写)
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        //获取事件名，并添加事件
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, newVal);
    }
    else {
        if (newVal === undefined || newVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, newVal);
        }
    }
};
// 添加到主容器
const insert = (child, parent, anthor) => {
    // 将 el 添加到 anthor 之前，倘若为 null ，则默认添加到最后，和 append() 一样。
    // 倘若给定的子节点是当前已存在的节点，则会将这个节点移动到锚点之前
    parent.insertBefore(child, anthor || null);
};
//操作 DOM 删除对应的标签
const remove = (children) => {
    const parent = children.parentNode;
    if (parent) {
        parent.removeChild(children);
    }
};
//操作 DOM 为标签添加文本
const setElementhost = (el, text) => {
    el.textContent = text;
};
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementhost,
});
//因为将之前的 createApp 变成了闭包，故这边需要重新导出 createApp 函数。
function createApp(...args) {
    //因为 renderer 的闭包 return 的值里就是之前的 createApp ，直接调用即可。
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    createRenderer: createRenderer,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementBlock: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    inject: inject,
    provider: provider,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref,
    proxyRefs: proxyRefs
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_BLOCK = Symbol('createElementBlock');
const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_BLOCK]: 'createElementBlock',
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    // 拼接的数据整理
    const functionName = 'render';
    const args = ['_ctx', '_cache'];
    const signature = args.join(',');
    // 处理导入的片段
    genFunctionPreamble(ast, context);
    // 文本拼接
    push(`function ${functionName}(${signature}) {`);
    push(`return `);
    genNode(ast.codegenNode, context);
    push(`}`);
    return {
        code: context.code,
    };
}
// 处理导入的片段
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = 'Vue';
    const helpers = ast.helpers;
    const aliasHeplers = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
    // 当 helpers 大于0时，才说明存在需要导入的值。
    if (helpers.length > 0) {
        push(`const { ${helpers.map(aliasHeplers).join(',')} } = ${VueBinging}`);
        push('\n');
    }
    push('return ');
}
/**
 * 获取 ast 中要输出的 content
 * @param node codegenNode
 * @param context
 */
function genNode(node, context) {
    // 不同的类型做不同的处理
    switch (node.type) {
        case 3 /* TEXT */:
            // 处理 text
            genText(node, context);
            break;
        case 0 /* INTERPOLATION */:
            // 处理插值
            genInterpolation(node, context);
            break;
        case 1 /* SIMPLE_EXPRESSION */:
            // 处理插值内的内容
            genExpression(node, context);
            break;
        case 2 /* ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* COMPOUND_EXPRESSION */:
            // 处理联合类型
            genCompoundExpression(node, context);
            break;
    }
}
// 将拼接的文本已经执行拼接的函数封装成一个对象，利于后续使用。
function createCodegenContext() {
    const context = {
        code: '',
        push: (source) => {
            context.code += source;
        },
        helper: (key) => {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    // 如果是插值类型，插值类型的值其实在 content 内，类型为 SIMPLE_EXPRESSION 。所以重新将 content 送入进行处理导出
    genNode(node.content, context);
    push(`)`);
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
// element 类型的输出
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_BLOCK)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(`)`);
}
// 将需要输出的数据转化为字符串
function genNodeList(nodes, context) {
    const { push } = context;
    // 循环
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            // 如果是字符串则直接输出
            push(node);
        }
        else {
            // 不是字符串则进入 genNode 继续处理
            genNode(node, context);
        }
        // 加上逗号
        if (i < nodes.length - 1) {
            push(', ');
        }
    }
}
// 对 tag, props, children 进行处理，如果为 undefiend 或空，则统一返回 null
function genNullable(args) {
    return args.map((arg) => arg || 'null');
}
// 处理复合类型
function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            // 如果是 string 类型则直接添加
            push(child);
        }
        else {
            // 否则传入 genNode 继续处理
            genNode(child, context);
        }
    }
}

// 处理 template
function baseParse(content) {
    // 将字符串嵌套在对象中
    const context = createParserContent(content);
    return createRoot(parseChildren(context, []));
}
// 对字符串进行处理
// ancestors 是存放 tag 的数组，用于 isEnd 函数的判断
function parseChildren(context, ancestors) {
    const nodes = [];
    let node;
    // 循环处理, 为的是将字符串逐一处理。
    while (!isEnd(context, ancestors)) {
        const s = context.source;
        if (s.startsWith('{{')) {
            // 处理{{}}
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            if (/[a-z]/i.test(s)) {
                // 处理 element
                node = parseElement(context, ancestors);
            }
        }
        else {
            // 处理 text
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
// 是否停止对字符串处理的循环
function isEnd(context, ancestors) {
    const s = context.source;
    for (let i = ancestors.length - 1; i >= 0; i--) {
        // 循环存放 tag 的数组，当当前处理的字符串与数组内的 tag 存在匹配时，返回 true
        const tag = ancestors[i];
        if (startsWithEndTagOpen(s, tag)) {
            return true;
        }
    }
    // 字符串是否为空
    return !s;
}
function parseTextData(context, length) {
    // 删除并推进
    const content = context.source.slice(0, length);
    adviceBy(context, length);
    return content;
}
function startsWithEndTagOpen(source, tag) {
    // 从2开始取是因为，判断的是尾部标签 </***>
    return source.slice(2, 2 + tag.length) === tag;
}
//#region 处理 text
function parseText(context) {
    let endIndex = context.source.length;
    let endToken = ['{{', '<'];
    for (let i = 0; i < endToken.length; i++) {
        // 判断并找出 text 的长度
        const index = context.source.indexOf(endToken[i]);
        // 判断所有情况，取最小值(最近的)
        if (index >= 0 && index < endIndex) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* TEXT */,
        content,
    };
}
//#endregion
//#region 处理 element
function parseElement(context, ancestors) {
    // 处理并获取需要 return 的对象
    const element = parseTag(context);
    // 将当前处理的 tag 存入数组。用于 isEnd 判断使用
    ancestors.push(element.tag);
    // 对标签内的数据进行解析
    element.children = parseChildren(context, ancestors);
    // 标签内部数据处理完成，删除该标签的判断用标识。
    ancestors.pop();
    // 判断后半段是否和 tag 相同。如果是则是完整标签正常消除。如果不是说明标签存在缺失，抛出异常。
    if (startsWithEndTagOpen(context.source, element.tag)) {
        // 再次处理是为了消除 element 的后半部分，例：</div>
        parseTag(context);
        return element;
    }
    else {
        throw `缺少结束标签：${element.tag}`;
    }
}
function parseTag(context, type) {
    /**
     * exec 会返回一个数组
     * 以 <div> 为例，数组第一个参数是：<div 。第二个参数是 div
     */
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    // 获取 tag
    const tag = match[1];
    // 将处理完的部分删除
    adviceBy(context, match[0].length);
    adviceBy(context, 1);
    // 倘若传入的是 end ，说明只是为了消除后半部分，已经处理完了，无需 return
    if (tag === 1 /* END */)
        return;
    return {
        type: 2 /* ELEMENT */,
        tag: tag,
    };
}
//#endregion
//#region 处理 {{}}
// 处理 {{}} 形式
function parseInterpolation(context) {
    const openDelimiter = '{{';
    const closeDelimiter = '}}';
    // 获取 '}}' 所在位置
    const closeIndex = context.source.indexOf(closeDelimiter);
    // 剪切字符串
    adviceBy(context, openDelimiter.length);
    // 获取到 {{}} 内的字符串长度
    const rawContentLength = closeIndex - openDelimiter.length;
    // 获取 {{}} 内的字符串并移除空格
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    // 在处理完上述之后，将这段 {{}} 字符串全部消除，因为还要处理后段字符串要处理。
    adviceBy(context, closeDelimiter.length);
    // 返回特定的格式
    return {
        type: 0 /* INTERPOLATION */,
        content: {
            type: 1 /* SIMPLE_EXPRESSION */,
            content: content,
        },
    };
}
// 剪切字符串
function adviceBy(context, length) {
    context.source = context.source.slice(length);
}
// 外包裹一个对象
function createRoot(children) {
    return {
        children,
        type: 4 /* ROOT */,
    };
}
// 将字符串嵌套在对象中
function createParserContent(content) {
    return {
        source: content,
    };
}
//#endregion

/**
 *
 * @param root baseParse 处理后的 ast
 * @param options 需要动态处理的配置对象
 */
function transform(root, options = {}) {
    // 创建一个公用对象
    const context = createTranseformContext(root, options);
    // 处理对象
    traverseNode(root, context);
    // 新增一个其本身的属性，便于后续操作。
    createRootCodegen(root);
    // 将处理之后全局对象上的 helpers 的 key 转为数组存入 ast 中，为之后操作提供。
    root.helpers = [...context.helpers.keys()];
}
// codegenNode 赋值
function createRootCodegen(root) {
    const child = root.children[0];
    // 如果是 element 类型，则将处理的 codegenNode 赋值
    if (child.type === 2 /* ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
// 生成一个全局对象，供后续操作
function createTranseformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper: (key) => {
            context.helpers.set(key, 1);
        },
    };
    return context;
}
/**
 *
 * @param node baseParse 处理后的 ast
 * @param context 全局对象
 */
function traverseNode(node, context) {
    // 获取传入的插件函数
    const nodeTransforms = context.nodeTransforms;
    /**
     * 保存执行的插件函数
     * 为了能让插件函数正序执行一遍再倒序执行一遍，如：123 -> 321(数字分别代表一个函数)
     */
    const exitFns = [];
    // 循环调用并执行这些插件函数
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        // 如果 onExit 存在，说明是需要倒序输出的插件函数，存入存储数组。
        if (onExit)
            exitFns.push(onExit);
    }
    // 根据当前处理的对象的类型，进行不同的处理
    switch (node.type) {
        case 0 /* INTERPOLATION */:
            // 是插值时，调用 helper 存入需要的字符串
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* ROOT */:
        case 2 /* ELEMENT */:
            // 只有类型为 root 和 element 才有 children
            // 如果该对象存在 children 则递归执行。
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        // 循环存储插件的数组，依次倒序执行函数
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}

// transformElement 中 element 类型最后的输出对象
function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_BLOCK);
    return {
        type: 2 /* ELEMENT */,
        tag,
        props,
        children,
    };
}

// element 的情况下，添加引用
function transformElement(node, context) {
    if (node.type === 2 /* ELEMENT */) {
        // return 一个函数是因为需要此插件倒序的时候执行
        return () => {
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            const vnodeChildren = children[0];
            // 如果是 element 类型则生成特殊的对象
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

// 处理插值的输出。
function transformExpression(node) {
    if (node.type === 0 /* INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    // 判断是否符合复合类型
    return node.type === 3 /* TEXT */ || node.type === 0 /* INTERPOLATION */;
}

function transformText(node) {
    const { children } = node;
    // 只有本身是 element 才执行
    if (node.type === 2 /* ELEMENT */) {
        // 需要倒序执行，return 一个函数
        return () => {
            // 存放输出结果的容器
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                // 判断是否是复合类型
                if (isText(child)) {
                    // 如果是以它为起点，开始向后查找和其相连的符合条件的 children
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            // 初始化
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(' + ');
                            currentContainer.children.push(next);
                            // 添加完后，删除原数组中对应的 children。
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            // 如果不负责，则重置容器退出循环
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

// 提供给入口调用的 template 转 code 字符串的函数
function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

//mini-vue 入口
// 通过 template 获取 render
function compileToFunction(template) {
    const { code } = baseCompile(template);
    /**
     * new Function 为新建函数。第一个参数是新建的函数的参数、第二个参数是 functionBody
     * 此处为新建函数之后调用该函数，返回 render
     */
    const render = new Function('Vue', code)(runtimeDom);
    return render;
}
// 将 compileToFunction 函数传入 component
registerRuntimeCompiler(compileToFunction);

export { createApp, createVNode as createElementBlock, createRenderer, createTextVNode, getCurrentInstance, h, inject, nextTick, provider, proxyRefs, ref, registerRuntimeCompiler, renderSlots, toDisplayString };
