export const __webpack_ids__ = [
    "327"
];
export const __webpack_modules__ = {
    "./src/components/Infra/Markdown/components/Mermaid.tsx": function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            default: ()=>__WEBPACK_DEFAULT_EXPORT__
        });
        var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("react/jsx-runtime");
        var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("react");
        var lodash_es__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("lodash-es");
        var mermaid__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__("mermaid");
        const Mermaid = /*#__PURE__*/ (0, react__WEBPACK_IMPORTED_MODULE_1__.memo)(({ processing, text })=>{
            const mermaidRef = (0, react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
            const mermaidDefaultConfig = (0, react__WEBPACK_IMPORTED_MODULE_1__.useMemo)(()=>{
                const types = [
                    'flowchart',
                    'sequence',
                    'gantt',
                    'journey',
                    'timeline',
                    'class',
                    'state',
                    'er',
                    'pie',
                    'quadrantChart',
                    'requirement',
                    'mindmap',
                    'gitGraph',
                    'c4',
                    'sankey'
                ];
                return null == types ? void 0 : types.reduce((config, type)=>{
                    config[type] = {
                        useWidth: 748,
                        useMaxWidth: true
                    };
                    return config;
                }, {});
            }, []);
            const getRandomInteger = (min, max)=>Math.floor(Math.random() * (max - min)) + min;
            const delay = (0, react__WEBPACK_IMPORTED_MODULE_1__.useMemo)(()=>{
                const range = processing ? [
                    1000,
                    1501
                ] : [
                    0,
                    31
                ];
                return getRandomInteger(range[0], range[1]);
            }, [
                processing
            ]);
            const mermaidRender = (text, node)=>{
                if (text && node) mermaid__WEBPACK_IMPORTED_MODULE_3__["default"].run({
                    nodes: [
                        node
                    ],
                    suppressErrors: true
                });
            };
            const mermaidRenderDebounce = (0, react__WEBPACK_IMPORTED_MODULE_1__.useCallback)((0, lodash_es__WEBPACK_IMPORTED_MODULE_2__.debounce)(mermaidRender, delay, {
                leading: true
            }), []);
            (0, react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
                mermaid__WEBPACK_IMPORTED_MODULE_3__["default"].initialize({
                    theme: 'forest',
                    startOnLoad: false,
                    fontSize: 12,
                    ...mermaidDefaultConfig
                });
            }, [
                mermaidDefaultConfig
            ]);
            (0, react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
                mermaidRenderDebounce(text, mermaidRef.current);
            }, [
                text,
                mermaidRenderDebounce
            ]);
            return /*#__PURE__*/ (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
                className: "mermaid-container",
                ref: mermaidRef,
                children: text
            });
        });
        const __WEBPACK_DEFAULT_EXPORT__ = Mermaid;
    }
};
