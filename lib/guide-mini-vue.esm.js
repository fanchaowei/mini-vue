//组件对象实例
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type
    };
    return component;
}
function setupComponent(instance) {
    //TODO
    //initProps
    //initSlots
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    //这里拿到createApp(App)传入的App参数
    const Component = instance.type;
    //获取其中的setup
    const { setup } = Component;
    if (setup) {
        /**
         * setup()会返回 function 或者 object
         * 返回 function：是组件的 runner 函数
         * 返回 object：会把这个对象注入到当前组件的上下文中
         */
        const setupResult = setup();
        //对返回值进行处理
        handleSetupResult(instance, setupResult);
    }
}
//处理setupResult
function handleSetupResult(instance, setupResult) {
    //TODO function
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}

/**
 * render只调用patch方法，方便后续递归的处理
 * @param vnode 虚拟节点
 * @param container 容器
 */
function render(vnode, container) {
    patch(vnode);
}
function patch(vnode, container) {
    processComponent(vnode);
}
//处理组件
function processComponent(vnode, container) {
    mountComponent(vnode);
}
//挂载组件
function mountComponent(vnode, container) {
    //创建组件对象实例，存储组件的一些必要的属性
    const instance = createComponentInstance(vnode);
    setupComponent(instance);
    setupRenderEffect(instance);
}
function setupRenderEffect(instance, container) {
    //生成虚拟节点树
    const subTree = instance.render();
    patch(subTree);
}

//创建虚拟节点
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children
    };
    return vnode;
}

/**
 * 文档解释：返回一个提供应用上下文的应用实例。应用实例挂载的整个组件树共享同一个上下文
 * @param rootComponent 根组件
 */
function createApp(rootComponent) {
    return {
        /**
         * 文档解释：所提供 DOM 元素的 innerHTML 将被替换为应用根组件的模板渲染结果
         * @param rootContainer 根容器
         */
        mount(rootContainer) {
            //这里会将输入的组件转换为vnode(虚拟节点)
            //后续所有操作都基于 vnode
            //将组件转化为虚拟节点
            const vnode = createVNode(rootComponent);
            render(vnode);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
