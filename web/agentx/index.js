import * as __WEBPACK_EXTERNAL_MODULE_lodash_es_18c59938__ from "lodash-es";
import * as __WEBPACK_EXTERNAL_MODULE_mermaid__ from "mermaid";
import * as __WEBPACK_EXTERNAL_MODULE_react__ from "react";
import * as __WEBPACK_EXTERNAL_MODULE_react_jsx_runtime_225474f2__ from "react/jsx-runtime";
import { Alert, App, Badge, Button as external_antd_Button, Card, ConfigProvider, Flex, Image as external_antd_Image, Input, Layout, List, Modal as external_antd_Modal, Popover, Radio, Skeleton, Slider, Space, Spin, Table as external_antd_Table, Tooltip as external_antd_Tooltip, Typography, message as external_antd_message, theme } from "antd";
import { useNavigate } from "react-router-dom";
import icons, { CaretRightOutlined, CheckOutlined, CloseOutlined, CopyOutlined, DownOutlined, DownloadOutlined, EyeOutlined, FireOutlined, LoadingOutlined, RedoOutlined, ShareAltOutlined, StepForwardOutlined, ToolOutlined, UpOutlined, WarningOutlined } from "@ant-design/icons";
import { Actions, Attachments, Bubble, Prompts, Sender, ThoughtChain, Welcome, XStream } from "@ant-design/x";
import { create } from "zustand";
import axios from "axios";
import classnames from "classnames";
import react_scroll_to_bottom from "react-scroll-to-bottom";
import react_markdown from "react-markdown";
import remark_gfm from "remark-gfm";
import remark_breaks from "remark-breaks";
import remark_emoji from "remark-emoji";
import remark_images from "remark-images";
import remark_math from "remark-math";
import remark_directive from "remark-directive";
import remark_directive_rehype from "remark-directive-rehype";
import rehype_katex from "rehype-katex";
import rehype_highlight from "rehype-highlight";
import rehype_raw from "rehype-raw";
import rehype_sanitize, { defaultSchema } from "rehype-sanitize";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { UAParser } from "ua-parser-js";
import react, { DiffEditor } from "@monaco-editor/react";
import ansi_to_react from "ansi-to-react";
import "react-player";
import { useSize } from "ahooks";
import docx from "@js-preview/docx";
import excel from "@js-preview/excel";
import { init } from "pptx-preview";
import "@js-preview/docx/lib/index.css";
import "@js-preview/excel/lib/index.css";
import lottie_react from "lottie-react";
import dayjs from "dayjs";
var __webpack_modules__ = {
    "lodash-es": function(module) {
        module.exports = __WEBPACK_EXTERNAL_MODULE_lodash_es_18c59938__;
    },
    mermaid: function(module) {
        module.exports = __WEBPACK_EXTERNAL_MODULE_mermaid__;
    },
    react: function(module) {
        module.exports = __WEBPACK_EXTERNAL_MODULE_react__;
    },
    "react/jsx-runtime": function(module) {
        module.exports = __WEBPACK_EXTERNAL_MODULE_react_jsx_runtime_225474f2__;
    }
};
var __webpack_module_cache__ = {};
function __webpack_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (void 0 !== cachedModule) return cachedModule.exports;
    var module = __webpack_module_cache__[moduleId] = {
        exports: {}
    };
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    return module.exports;
}
__webpack_require__.m = __webpack_modules__;
(()=>{
    __webpack_require__.d = (exports, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) Object.defineProperty(exports, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.f = {};
    __webpack_require__.e = (chunkId)=>Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key)=>{
            __webpack_require__.f[key](chunkId, promises);
            return promises;
        }, []));
})();
(()=>{
    __webpack_require__.u = (chunkId)=>"" + chunkId + ".js";
})();
(()=>{
    __webpack_require__.miniCssF = (chunkId)=>"" + chunkId + ".css";
})();
(()=>{
    __webpack_require__.g = (()=>{
        if ('object' == typeof globalThis) return globalThis;
        try {
            return this || new Function('return this')();
        } catch (e) {
            if ('object' == typeof window) return window;
        }
    })();
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports)=>{
        if ('undefined' != typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports, '__esModule', {
            value: true
        });
    };
})();
(()=>{
    var scriptUrl;
    if ("string" == typeof import.meta.url) scriptUrl = import.meta.url;
    if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
    scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
    __webpack_require__.p = scriptUrl;
})();
(()=>{
    var installedChunks = {
        980: 0
    };
    var installChunk = (data)=>{
        var __webpack_ids__ = data.__webpack_ids__;
        var __webpack_modules__ = data.__webpack_modules__;
        var __webpack_runtime__ = data.__webpack_runtime__;
        var moduleId, chunkId, i = 0;
        for(moduleId in __webpack_modules__)if (__webpack_require__.o(__webpack_modules__, moduleId)) __webpack_require__.m[moduleId] = __webpack_modules__[moduleId];
        if (__webpack_runtime__) __webpack_runtime__(__webpack_require__);
        for(; i < __webpack_ids__.length; i++){
            chunkId = __webpack_ids__[i];
            if (__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) installedChunks[chunkId][0]();
            installedChunks[__webpack_ids__[i]] = 0;
        }
    };
    __webpack_require__.f.j = function(chunkId, promises) {
        var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : void 0;
        if (0 !== installedChunkData) if (installedChunkData) promises.push(installedChunkData[1]);
        else {
            var promise = import("./" + __webpack_require__.u(chunkId)).then(installChunk, (e)=>{
                if (0 !== installedChunks[chunkId]) installedChunks[chunkId] = void 0;
                throw e;
            });
            var promise = Promise.race([
                promise,
                new Promise((resolve)=>{
                    installedChunkData = installedChunks[chunkId] = [
                        resolve
                    ];
                })
            ]);
            promises.push(installedChunkData[1] = promise);
        }
    };
})();
var jsx_runtime_ = __webpack_require__("react/jsx-runtime");
var external_react_ = __webpack_require__("react");
var types_TaskStage = /*#__PURE__*/ function(TaskStage) {
    TaskStage[TaskStage["Pending"] = 0] = "Pending";
    TaskStage[TaskStage["Thinking"] = 1] = "Thinking";
    TaskStage[TaskStage["Planning"] = 2] = "Planning";
    TaskStage[TaskStage["Executing"] = 3] = "Executing";
    TaskStage[TaskStage["Hitl"] = 4] = "Hitl";
    TaskStage[TaskStage["Success"] = 5] = "Success";
    TaskStage[TaskStage["Failure"] = 6] = "Failure";
    return TaskStage;
}({});
var types_TaskStatus = /*#__PURE__*/ function(TaskStatus) {
    TaskStatus["Pending"] = "pending";
    TaskStatus["Running"] = "running";
    TaskStatus["Success"] = "success";
    TaskStatus["Error"] = "error";
    return TaskStatus;
}({});
var types_AgentMode = /*#__PURE__*/ function(AgentMode) {
    AgentMode[AgentMode["Chatbot"] = 0] = "Chatbot";
    AgentMode[AgentMode["Replay"] = 1] = "Replay";
    return AgentMode;
}({});
var external_lodash_es_ = __webpack_require__("lodash-es");
const agent_useAgentStore = create((set, get)=>({
        agentId: '',
        sessionId: '',
        sessionInfo: void 0,
        basePath: '',
        backPath: '',
        mode: types_AgentMode.Chatbot,
        shareId: '',
        sharePassword: '',
        isNavigating: false,
        pipelineMessages: [],
        pipelineTargetMessage: null,
        workspaceMessages: [],
        workspaceVisible: false,
        taskStage: types_TaskStage.Pending,
        taskPlan: [],
        chunks: [],
        senderLoading: false,
        senderStopping: false,
        senderSending: false,
        senderContent: '',
        senderFiles: [],
        senderKnowledgeBases: [],
        selectedSenderKnowledgeBases: [],
        senderMCPTools: [],
        senderSandboxTools: [],
        selectedSenderMCPTools: [],
        fileViewerFile: void 0,
        extraHeaders: {},
        requestPrefix: '',
        previousSessionId: '',
        abortController: null,
        setPreviousSessionId: (id)=>set({
                previousSessionId: id
            }),
        setAgentId: (agentId)=>set({
                agentId
            }),
        setSessionId: (sessionId)=>set({
                sessionId
            }),
        setSessionInfo: (sessionInfo)=>set({
                sessionInfo
            }),
        setBasePath: (basePath)=>set({
                basePath
            }),
        setBackPath: (backPath)=>set({
                backPath
            }),
        setMode: (mode)=>set({
                mode
            }),
        setShareId: (shareId)=>set({
                shareId
            }),
        setSharePassword: (sharePassword)=>set({
                sharePassword
            }),
        setIsNavigating: (isNavigating)=>set({
                isNavigating
            }),
        setPipelineMessages: (pipelineMessages)=>set({
                pipelineMessages
            }),
        setPipelineTargetMessage: (pipelineTargetMessage)=>set({
                pipelineTargetMessage,
                workspaceVisible: true,
                fileViewerFile: void 0
            }),
        setWorkspaceMessages: (workspaceMessages)=>set({
                workspaceMessages
            }),
        setWorkspaceVisible: (workspaceVisible)=>set({
                workspaceVisible,
                fileViewerFile: void 0
            }),
        setFileViewerFile: (fileViewerFile)=>set({
                fileViewerFile,
                workspaceVisible: false
            }),
        setTaskStage: (taskStage)=>set({
                taskStage
            }),
        setTaskPlan: (taskPlan)=>set({
                taskPlan
            }),
        setChunks: (payload)=>set(({ chunks })=>({
                    chunks: (0, external_lodash_es_.isFunction)(payload) ? payload(chunks) : payload
                })),
        addChunk: (chunk)=>set(({ chunks })=>({
                    chunks: [
                        ...chunks,
                        chunk
                    ]
                })),
        clearChunks: ()=>set({
                chunks: []
            }),
        setSenderLoading: (senderLoading)=>set({
                senderLoading
            }),
        setSenderStopping: (senderStopping)=>set({
                senderStopping
            }),
        setSenderSending: (senderSending)=>set({
                senderSending
            }),
        setSenderContent: (senderContent)=>set({
                senderContent
            }),
        setSenderFiles: (payload)=>set(({ senderFiles })=>({
                    senderFiles: (0, external_lodash_es_.isFunction)(payload) ? payload(senderFiles) : payload
                })),
        setSenderKnowledgeBases: (senderKnowledgeBases)=>set({
                senderKnowledgeBases
            }),
        setSelectedSenderKnowledgeBases: (selectedSenderKnowledgeBases)=>set({
                selectedSenderKnowledgeBases
            }),
        setSenderMCPTools: (senderMCPTools)=>set({
                senderMCPTools
            }),
        setSenderSandboxTools: (senderSandboxTools)=>set({
                senderSandboxTools
            }),
        setSelectedSenderMCPTools: (selectedSenderMCPTools)=>set({
                selectedSenderMCPTools
            }),
        setExtraHeaders: (extraHeaders)=>set({
                extraHeaders
            }),
        setRequestPrefix: (requestPrefix)=>set({
                requestPrefix
            }),
        setAbortController: (controller)=>set({
                abortController: controller
            }),
        resetStore: ()=>{
            var _get_abortController;
            null == (_get_abortController = get().abortController) || _get_abortController.abort();
            set({
                chunks: [],
                senderFiles: [],
                sessionInfo: void 0,
                senderLoading: false,
                senderStopping: false,
                senderSending: false,
                senderContent: '',
                fileViewerFile: void 0,
                taskPlan: [],
                pipelineMessages: [],
                pipelineTargetMessage: null,
                workspaceMessages: [],
                abortController: null,
                workspaceVisible: false
            });
        }
    }));
const agent = agent_useAgentStore;
var en_namespaceObject = JSON.parse('{"welcome":"Welcome","go.back":"Go Back","feature.future":"Coming Soon","url.404":"URL Not Found","code.copy":"Copy Code","code.copy.success":"Copied to your system clipboard!","chatbot.task.success":"The current task has been completed","chatbot.task.fail":"The current task has failed","chatbot.task.hilt.operate":"Please Operate","chatbot.task.hilt.operate.finish":"Has Finished Operating","chatbot.task.hilt.continue":"Continue Task","workspace":"Workspace","workspace.controller.real-time":"Real-Time","workspace.controller.jump-to-real-time":"Jump to Real-Time","workspace.task.progress":"Task Progress","sender.placeholder":"Please give me a task","sender.knowledge-base":"Knowledge Base","sender.knowledge-base.table.name":"Name","sender.knowledge-base.table.creation-time":"Creation Time","sender.btn.mcp":"MCP Extentions","sender.mcp.add":"Add MCP Extention","sender.mcp.selected.knowledge-base":"Selected Knowledge Base","sender.mcp.selected.mcp-service":"Selected MCP Service","sender.mcp.selected.sandbox":"Selected Sandbox","sender.replay.restart":"Restart","sender.replay.end":"Jump to End","button.ok":"OK","button.confirm":"Confirm","button.cancel":"Cancel","share.password":"Password","share.authentication":"Authentication","code.preview":"Preview","code.raw":"Raw","file.upload.format.error":"File format not supported, please upload files in the following formats:","file.upload.size.error":"The file size cannot exceed","file.upload.count.error":"The number of files cannot exceed","chatbot.task.thinking":"Thinking","code.diff":"Diff","code.old":"Old","code.new":"New","user.input.brief":"Will continue to work after your reply","code.interpreter.execution.result":"Execution Result","code.interpreter.execution.result.placeholder":"// The execution result will be displayed here","error.image.generation.failed":"Image generation failed","error.password.incorrect":"Password incorrect","mcp.tool.coming":"Coming Soon","tool.tab.mcp":"MCP","tool.tab.sandbox":"Sandbox","tool.tab.ai-app":"AI Applications","task.finish.reason.completed":"Completed Current Task","task.finish.reason.failed":"Task Failed","task.finish.reason.cancelled":"User Cancelled","task.finish.reason.abnormal":"Task Abnormal","task.phone.continue.title":"Cloud Phone","task.phone.continue.text1":"Please operate on","task.phone.continue.text2":"to continue the task","task.phone.continue.text3":"Has Finished Operating","task.phone.continue.text4":"on the phone, continue the task","task.user_input.continue.button":"Continue","task.user_input.take_over_browser.button":"Click to Open Browser","task.replay.replaying":"Replaying...","task.replay.finished":"Replay Finished!","sex":"Sex","age":"Age","rateInfo":"Rate Information"}');
var zh_namespaceObject = JSON.parse('{"welcome":"欢迎","go.back":"返回","feature.future":"即将发布, 敬请期待","url.404":"URL未找到","code.copy":"复制代码","code.copy.success":"已经复制到您的系统剪贴板!","chatbot.task.success":"当前任务已完成","chatbot.task.fail":"当前任务失败","chatbot.task.hilt.operate":"请操作","chatbot.task.hilt.operate.finish":"已完成操作","chatbot.task.hilt.continue":"继续任务","workspace":"工作区","workspace.controller.real-time":"实时","workspace.controller.jump-to-real-time":"跳到实时","workspace.task.progress":"任务进度","sender.placeholder":"请给我一个任务","sender.knowledge-base":"知识库","sender.knowledge-base.table.name":"名称","sender.knowledge-base.table.creation-time":"创建时间","sender.btn.mcp":"MCP拓展","sender.mcp.add":"添加MCP拓展","sender.mcp.selected.knowledge-base":"已选知识库","sender.mcp.selected.mcp-service":"已选MCP服务","sender.mcp.selected.sandbox":"已选安全沙箱","sender.replay.restart":"重新开始","sender.replay.end":"跳到结束","button.ok":"确定","button.confirm":"确认","button.cancel":"取消","share.password":"密码","share.authentication":"回放密码","code.preview":"预览","code.raw":"代码","file.upload.format.error":"文件格式不支持, 请上传以下格式：","file.upload.size.error":"文件大小不能超过","file.upload.count.error":"文件数量不能超过","chatbot.task.thinking":"思考中","code.diff":"差异","code.old":"原始","code.new":"修改后","user.input.brief":"将在您的回复后继续工作","code.interpreter.execution.result":"执行结果","code.interpreter.execution.result.placeholder":"// 执行结果将在这里显示","error.image.generation.failed":"图片生成失败","error.password.incorrect":"密码错误","mcp.tool.coming":"即将上线","tool.tab.mcp":"MCP服务","tool.tab.sandbox":"安全沙箱","tool.tab.ai-app":"AI应用","task.finish.reason.completed":"已完成当前任务","task.finish.reason.failed":"任务失败","task.finish.reason.cancelled":"用户已取消","task.finish.reason.abnormal":"任务异常","task.phone.continue.title":"云手机","task.phone.continue.text1":"请在","task.phone.continue.text2":"上继续操作","task.phone.continue.text3":"已在","task.phone.continue.text4":"上完成操作，继续任务","task.user_input.continue.button":"继续","task.user_input.take_over_browser.button":"点击打开浏览器","task.replay.replaying":"任务回顾中...","task.replay.finished":"任务回顾完成！","sex":"性别","age":"年龄","rateInfo":"费率信息"}');
const resources = {
    en: en_namespaceObject,
    zh: zh_namespaceObject
};
const changeLanguage = (lang)=>{
    localStorage.setItem('i18nextLng', lang);
    window.dispatchEvent(new CustomEvent('languageChanged'));
};
const useTranslation_useTranslation = ()=>{
    const [language, setLanguage] = (0, external_react_.useState)(()=>useTranslation_getLanguage());
    (0, external_react_.useEffect)(()=>{
        const handleStorageChange = (e)=>{
            if ('i18nextLng' === e.key && e.newValue) setLanguage(e.newValue);
        };
        const handleLocalStorageChange = ()=>{
            const newLang = useTranslation_getLanguage();
            if (newLang !== language) setLanguage(newLang);
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('languageChanged', handleLocalStorageChange);
        return ()=>{
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('languageChanged', handleLocalStorageChange);
        };
    }, [
        language
    ]);
    const currentLangPack = (0, external_react_.useMemo)(()=>resources[language] || {}, [
        language
    ]);
    const t = (0, external_react_.useCallback)((key)=>currentLangPack[key] || key, [
        currentLangPack
    ]);
    return (0, external_react_.useMemo)(()=>({
            t,
            language
        }), [
        t,
        language
    ]);
};
const useTranslation_getTranslation = (key)=>{
    const language = useTranslation_getLanguage();
    return resources[language][key] || key;
};
const useTranslation_getLanguage = ()=>{
    const langInStorage = localStorage.getItem('i18nextLng');
    if ([
        'zh',
        'en'
    ].includes(langInStorage)) return langInStorage;
    if ('zh-CN' === langInStorage) {
        localStorage.setItem('i18nextLng', 'zh');
        return 'zh';
    }
    if ('en-US' === langInStorage) {
        localStorage.setItem('i18nextLng', 'en');
        return 'en';
    }
    localStorage.setItem('i18nextLng', 'en');
    return 'en';
};
const request = axios.create({
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});
request.interceptors.request.use((config)=>{
    config.headers.set('language', useTranslation_getLanguage());
    return config;
}, (error)=>{
    console.error('Request error:', error);
    return Promise.reject(error);
});
request.interceptors.response.use((response)=>{
    var _response_headers_contenttype;
    const { data, config } = response;
    if (null == (_response_headers_contenttype = response.headers['content-type']) ? void 0 : _response_headers_contenttype.includes('text/event-stream')) return response;
    if (200 !== data.code && 0 !== data.code) {
        const errorMessage = data.message || "\u8BF7\u6C42\u5931\u8D25";
        const showError = false !== config.showError;
        if (showError) external_antd_message.error(errorMessage);
        return Promise.reject(new Error(errorMessage));
    }
    return response;
}, (error)=>{
    const { config, response } = error;
    console.error('Response error:', error);
    let errorMessage = "\u7F51\u7EDC\u9519\u8BEF";
    if (response) switch(response.status){
        case 400:
            errorMessage = "\u8BF7\u6C42\u53C2\u6570\u9519\u8BEF";
            break;
        case 401:
            errorMessage = "\u672A\u6388\u6743\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55";
            break;
        case 403:
            errorMessage = "\u62D2\u7EDD\u8BBF\u95EE";
            break;
        case 404:
            errorMessage = "\u8BF7\u6C42\u7684\u8D44\u6E90\u4E0D\u5B58\u5728";
            break;
        case 500:
            errorMessage = "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF";
            break;
        case 502:
            errorMessage = "\u7F51\u5173\u9519\u8BEF";
            break;
        case 503:
            errorMessage = "\u670D\u52A1\u4E0D\u53EF\u7528";
            break;
        default:
            errorMessage = `\u{8BF7}\u{6C42}\u{5931}\u{8D25} (${response.status})`;
    }
    else if ('ECONNABORTED' === error.code) errorMessage = "\u8BF7\u6C42\u8D85\u65F6";
    else if (error.message) errorMessage = error.message;
    const showError = (null == config ? void 0 : config.showError) !== false;
    if (showError) external_antd_message.error(errorMessage);
    return Promise.reject(error);
});
const request_http = {
    get (url, config) {
        return request.get(url, config).then((response)=>response.data);
    },
    post (url, data, config) {
        return request.post(url, data, config).then((response)=>response.data);
    },
    put (url, data, config) {
        return request.put(url, data, config).then((response)=>response.data);
    },
    delete (url, config) {
        return request.delete(url, config).then((response)=>response.data);
    },
    patch (url, data, config) {
        return request.patch(url, data, config).then((response)=>response.data);
    },
    request
};
const services_request = request_http;
const api_sessionApi = {
    create: (params)=>services_request.post(`${agent.getState().requestPrefix}/api/v1/sessions/`, params),
    getDetail: (sessionId)=>services_request.get(`${agent.getState().requestPrefix}/api/v1/sessions/${sessionId}/detail`),
    sendMessage: (sessionId, params)=>services_request.request.post(`${agent.getState().requestPrefix}/api/v1/sessions/${sessionId}/send`, params, {
            headers: {
                accept: 'text/event-stream',
                'Content-Type': 'application/json',
                language: useTranslation_getLanguage()
            }
        }),
    stopTask: (sessionId)=>services_request.post(`${agent.getState().requestPrefix}/api/v1/chat/stop`, {
            session_id: sessionId
        }),
    addNewMessage: (sessionId, message)=>services_request.post(`${agent.getState().requestPrefix}/api/v1/sessions/${sessionId}/new_message`, {
            message
        })
};
const ignoreToolChunks = [
    'agent_update_plan',
    'agent_advance_phase',
    'agent_end_task',
    'config',
    'ask_user'
];
function filterLiveStatus(message) {
    message.messages = message.messages.filter((msg)=>'live_status' !== msg.type).map((msg)=>{
        if (isPlanChunk(msg)) {
            const plan = msg;
            plan.children = plan.children.map((step)=>{
                step.children = step.children.filter((child)=>'live_status' !== child.type);
                return step;
            });
            return plan;
        }
        return msg;
    });
    return message;
}
function changePlanStepStatusToSuccess(message) {
    message.messages.forEach((msg)=>{
        if (isPlanChunk(msg)) msg.children.forEach((step)=>{
            if (step.status === types_TaskStatus.Running) step.status = types_TaskStatus.Success;
        });
    });
    return message;
}
function hideFutureSteps(message) {
    message.messages.forEach((msg)=>{
        if (isPlanChunk(msg)) msg.children = msg.children.filter((step)=>step.status === types_TaskStatus.Success || step.status === types_TaskStatus.Running);
    });
    return message;
}
function hideEmptySteps(message) {
    message.messages.forEach((msg)=>{
        if (isPlanChunk(msg)) msg.children = msg.children.filter((step)=>step.children.length > 0);
    });
    return message;
}
function isPlanChunk(message) {
    return 'plan' === message.type;
}
const transformChunksToMessages = (chunks)=>{
    var _newMessages_;
    const chunksCopy = (0, external_lodash_es_.cloneDeep)(chunks);
    const newMessages = [];
    let currentAIMessage = null;
    const latestLiveStatusChunk = chunksCopy.slice().reverse().find((chunk)=>'live_status' === chunk.type);
    for(let i = 0; i < chunksCopy.length; i++){
        var _chunk_detail;
        const chunk = chunksCopy[i];
        const futureChunks = chunksCopy.slice(i + 1);
        const hasUserMessage = futureChunks.some((chunk)=>'user' === chunk.role);
        chunk.isLast = !hasUserMessage;
        if (ignoreToolChunks.includes(null == (_chunk_detail = chunk.detail) ? void 0 : _chunk_detail.tool) || ignoreToolChunks.includes(chunk.type)) continue;
        if ('user' === chunk.role) {
            if (currentAIMessage) {
                currentAIMessage = filterLiveStatus(currentAIMessage);
                currentAIMessage = changePlanStepStatusToSuccess(currentAIMessage);
                currentAIMessage = hideFutureSteps(currentAIMessage);
                currentAIMessage = hideEmptySteps(currentAIMessage);
                newMessages.push(currentAIMessage);
                currentAIMessage = null;
            }
            newMessages.push({
                role: 'user',
                messages: [
                    chunk
                ]
            });
            continue;
        }
        if (!currentAIMessage) currentAIMessage = {
            role: 'assistant',
            messages: []
        };
        if ('live_status' === chunk.type) {
            if (chunk.id === (null == latestLiveStatusChunk ? void 0 : latestLiveStatusChunk.id)) {
                const latestPlan = currentAIMessage.messages.find(isPlanChunk);
                if (latestPlan) {
                    const step = latestPlan.children.find((step)=>'running' === step.status);
                    if (step) {
                        step.children.push(chunk);
                        continue;
                    }
                }
                currentAIMessage.messages.push(chunk);
            }
            continue;
        }
        if (isPlanChunk(chunk)) {
            currentAIMessage = filterLiveStatus(currentAIMessage);
            currentAIMessage.messages.push(handlePlanChunk(chunk));
            continue;
        }
        if ('plan_update' === chunk.type) {
            const planUpdateChunk = chunk;
            const plan = currentAIMessage.messages.find(isPlanChunk);
            if (plan) handlePlanUpdateChunk(plan, planUpdateChunk);
            continue;
        }
        if ('tool_call' === chunk.type) {
            const toolCallChunk = chunk;
            chunk.type = toolCallChunk.detail.tool;
            const toolResultChunk = chunksCopy.find((resultChunk)=>{
                var _resultChunk_detail, _toolCallChunk_detail;
                return 'tool_result' === resultChunk.type && (null == (_resultChunk_detail = resultChunk.detail) ? void 0 : _resultChunk_detail.run_id) === (null == (_toolCallChunk_detail = toolCallChunk.detail) ? void 0 : _toolCallChunk_detail.run_id);
            });
            if (toolResultChunk) {
                toolResultChunk.content = toolCallChunk.content;
                toolResultChunk.detail = {
                    ...toolResultChunk.detail,
                    param: toolCallChunk.detail.param,
                    action: toolCallChunk.detail.action,
                    action_content: toolCallChunk.detail.action_content
                };
                continue;
            }
        }
        if ('tool_result' === chunk.type) {
            const toolResultChunk = chunk;
            chunk.type = toolResultChunk.detail.tool;
        }
        if ('user_input' === chunk.type) {
            currentAIMessage = filterLiveStatus(currentAIMessage);
            currentAIMessage.messages.push(chunk);
            continue;
        }
        if (isFinishChunk(chunk)) {
            currentAIMessage = filterLiveStatus(currentAIMessage);
            currentAIMessage.messages.push(chunk);
            continue;
        }
        const plan = currentAIMessage.messages.find(isPlanChunk);
        if (chunk.step_id) {
            if (plan) {
                const step = plan.children.find((step)=>step.id === chunk.step_id);
                if (step) {
                    step.children = step.children.filter((child)=>'live_status' !== child.type);
                    step.children.push(chunk);
                    continue;
                }
            }
        }
        if (plan) {
            const step = plan.children.find((step)=>'running' === step.status);
            if (step) {
                step.children.push(chunk);
                continue;
            }
        }
        currentAIMessage = filterLiveStatus(currentAIMessage);
        currentAIMessage.messages.push(chunk);
    }
    if (currentAIMessage) {
        if (isMessageFinish(currentAIMessage)) {
            currentAIMessage = filterLiveStatus(currentAIMessage);
            currentAIMessage = changePlanStepStatusToSuccess(currentAIMessage);
        }
        currentAIMessage = hideFutureSteps(currentAIMessage);
        currentAIMessage = hideEmptySteps(currentAIMessage);
        newMessages.push(currentAIMessage);
    }
    if ((null == (_newMessages_ = newMessages[newMessages.length - 1]) ? void 0 : _newMessages_.role) === 'user') newMessages.push({
        role: 'assistant',
        messages: [
            {
                type: 'live_status',
                content: useTranslation_getTranslation('chatbot.task.thinking')
            }
        ]
    });
    return newMessages;
};
function handlePlanChunk(chunk) {
    const plan = {
        ...chunk,
        children: chunk.detail.steps.map(stepMapper)
    };
    return plan;
}
function handlePlanUpdateChunk(plan, planUpdateChunk) {
    var _planUpdateChunk_detail, _planUpdateChunk_detail1, _planUpdateChunk_detail2;
    if ((null == (_planUpdateChunk_detail = planUpdateChunk.detail) ? void 0 : _planUpdateChunk_detail.action) === 'add') if (plan.children) plan.children.push(...planUpdateChunk.detail.steps.map(stepMapper));
    else plan.children = planUpdateChunk.detail.steps.map(stepMapper);
    if ((null == (_planUpdateChunk_detail1 = planUpdateChunk.detail) ? void 0 : _planUpdateChunk_detail1.action) === 'update') {
        var _planUpdateChunk_detail_steps, _planUpdateChunk_detail3;
        null == (_planUpdateChunk_detail3 = planUpdateChunk.detail) || null == (_planUpdateChunk_detail_steps = _planUpdateChunk_detail3.steps) || _planUpdateChunk_detail_steps.forEach((newStep)=>{
            const index = plan.children.findIndex((step)=>step.id === newStep.id);
            if (-1 !== index) plan.children[index] = {
                ...plan.children[index],
                ...newStep
            };
        });
    }
    if ((null == (_planUpdateChunk_detail2 = planUpdateChunk.detail) ? void 0 : _planUpdateChunk_detail2.action) === 'remove') {
        var _planUpdateChunk_detail_steps1, _planUpdateChunk_detail4;
        null == (_planUpdateChunk_detail4 = planUpdateChunk.detail) || null == (_planUpdateChunk_detail_steps1 = _planUpdateChunk_detail4.steps) || _planUpdateChunk_detail_steps1.forEach((newStep)=>{
            const index = plan.children.findIndex((step)=>step.id === newStep.id);
            if (-1 !== index) plan.children.splice(index, 1);
        });
    }
    return plan;
}
const getPlan = (chunks)=>{
    const lastUserMessageIndex = chunks.findLastIndex((chunk)=>'user' === chunk.role);
    if (-1 === lastUserMessageIndex) return null;
    const aiChunks = chunks.slice(lastUserMessageIndex + 1);
    const planChunks = aiChunks.filter((chunk)=>isPlanChunk(chunk) || 'plan_update' === chunk.type);
    let plan = null;
    for (const chunk of planChunks){
        if (isPlanChunk(chunk)) plan = handlePlanChunk(chunk);
        if ('plan_update' === chunk.type && plan) {
            const planUpdateChunk = chunk;
            plan = handlePlanUpdateChunk(plan, planUpdateChunk);
        }
    }
    if (aiChunks.some((chunk)=>isFinishChunk(chunk)) && plan) plan.children.forEach((step)=>{
        if (step.status === types_TaskStatus.Running) step.status = types_TaskStatus.Success;
    });
    return plan;
};
const isMessageFinish = (message)=>message.messages.some((msg)=>isFinishChunk(msg));
function isFinishChunk(chunk) {
    return 'agent_end_task' === chunk.type || 'error' === chunk.type || 'finish_reason' === chunk.type;
}
const stepMapper = (step)=>({
        ...step,
        children: []
    });
const getSession = async (conversation_id)=>{
    try {
        const response = await api_sessionApi.getDetail(conversation_id);
        return response.data;
    } catch (error) {
        console.error('Failed to get session:', error);
        throw error;
    }
};
const isToolMessage = (chunk)=>{
    var _chunk_detail, _chunk_detail1;
    return !!(null == (_chunk_detail = chunk.detail) ? void 0 : _chunk_detail.tool) && (null == (_chunk_detail1 = chunk.detail) ? void 0 : _chunk_detail1.tool) !== 'agent_end_task';
};
const useChunksProcessor = (chunks)=>{
    const { setPipelineMessages, setTaskPlan, setWorkspaceMessages } = agent();
    (0, external_react_.useEffect)(()=>{
        const newMessages = transformChunksToMessages((0, external_lodash_es_.cloneDeep)(chunks));
        setPipelineMessages(newMessages);
    }, [
        chunks,
        setPipelineMessages
    ]);
    (0, external_react_.useEffect)(()=>{
        const plan = getPlan((0, external_lodash_es_.cloneDeep)(chunks));
        if (!(0, external_lodash_es_.isEqual)(agent.getState().taskPlan, null == plan ? void 0 : plan.children)) setTaskPlan((null == plan ? void 0 : plan.children) || []);
    }, [
        chunks,
        setTaskPlan
    ]);
    (0, external_react_.useEffect)(()=>{
        const chunksCopy = (0, external_lodash_es_.cloneDeep)(chunks);
        const detailList = chunksCopy.filter((chunk, index)=>{
            var _toolChunk_detail;
            const toolChunk = chunk;
            if (!isToolMessage(toolChunk) || ignoreToolChunks.includes(null == (_toolChunk_detail = toolChunk.detail) ? void 0 : _toolChunk_detail.tool) || ignoreToolChunks.includes(toolChunk.type)) return false;
            if ('tool_call' === toolChunk.type) {
                const toolResultChunk = chunksCopy.find((resultChunk, index2)=>{
                    var _resultChunk_detail, _toolChunk_detail;
                    return 'tool_result' === resultChunk.type && (null == (_resultChunk_detail = resultChunk.detail) ? void 0 : _resultChunk_detail.run_id) === (null == (_toolChunk_detail = toolChunk.detail) ? void 0 : _toolChunk_detail.run_id) && index2 > index;
                });
                if (toolResultChunk) return false;
            }
            if ('tool_result' === toolChunk.type) {
                const toolCallChunk = chunksCopy.findLast((chunk, index2)=>{
                    var _chunk_detail, _toolChunk_detail;
                    return 'tool_call' === chunk.type && (null == (_chunk_detail = chunk.detail) ? void 0 : _chunk_detail.run_id) === (null == (_toolChunk_detail = toolChunk.detail) ? void 0 : _toolChunk_detail.run_id) && index2 < index;
                });
                if (toolCallChunk) {
                    toolChunk.content = toolCallChunk.content;
                    toolChunk.detail = {
                        ...toolChunk.detail,
                        param: toolCallChunk.detail.param,
                        action: toolCallChunk.detail.action,
                        action_content: toolCallChunk.detail.action_content
                    };
                }
            }
            const currentIndex = index;
            const futureChunks = chunksCopy.slice(currentIndex + 1);
            const futureHasUserInput = futureChunks.some((chunk)=>'user' === chunk.role);
            if (futureHasUserInput) chunk.isFinish = true;
            const futureHasFinish = futureChunks.some((chunk)=>'finish_reason' === chunk.type);
            if (futureHasFinish) chunk.isFinish = true;
            return true;
        }).map((chunk)=>({
                ...chunk,
                type: chunk.detail.tool
            }));
        setWorkspaceMessages(detailList);
    }, [
        chunks,
        setWorkspaceMessages
    ]);
};
const isJsonString = (str)=>{
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};
function devLog(...args) {
    if ('development' === process.env.NODE_ENV) console.log(...args);
}
function _define_property(obj, key, value) {
    if (key in obj) Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
    });
    else obj[key] = value;
    return obj;
}
class EventBus {
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter((cb)=>cb !== callback);
    }
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach((callback)=>callback(data));
    }
    constructor(){
        _define_property(this, "events", {});
    }
}
const eventBus = new EventBus();
const utils_eventBus = eventBus;
const MAX_RETRY_COUNT = 10;
const RETRY_DELAY = 60000;
const useChat_useChat = (basePath, agentId, sessionId)=>{
    (0, external_react_.useEffect)(()=>{
        devLog('useChat mount', basePath, agentId, sessionId);
        return ()=>{
            devLog('useChat unmount');
        };
    }, []);
    const { chunks } = agent();
    const navigate = useNavigate();
    useChunksProcessor(chunks);
    const basePathRef = (0, external_react_.useRef)(basePath);
    const agentIdRef = (0, external_react_.useRef)(agentId);
    const sessionIdRef = (0, external_react_.useRef)(sessionId);
    const handleChunk = (0, external_react_.useCallback)((chunk)=>{
        if (!isJsonString(chunk)) return void console.error('handleChunk chunk is not json string', chunk);
        const data = JSON.parse(chunk);
        devLog('handleChunk', data);
        if ('user' === data.role) {
            agent.getState().setChunks(agent.getState().chunks.filter((chunk)=>!chunk.loading));
            agent.getState().setSenderLoading(false);
        }
        if (4102 === data.code) {
            agent.getState().addChunk({
                id: Date.now().toString(),
                role: 'assistant',
                type: 'error',
                content: data.message || 'Session is archived'
            });
            agent.getState().setSessionInfo({
                ...agent.getState().sessionInfo,
                status: 'ARCHIVED'
            });
            return;
        }
        if ('session_init' === data.type) {
            const { detail: { session_id, title } } = data;
            const finalSessionId = session_id;
            agent.getState().setSessionInfo({
                session_id,
                title
            });
            agent.getState().setIsNavigating(true);
            agent.getState().setPreviousSessionId(finalSessionId);
            navigate(`${basePathRef.current}/${agentIdRef.current}/${finalSessionId}`);
            sessionIdRef.current = finalSessionId;
            return;
        }
        agent.getState().addChunk(data);
    }, []);
    const onSendComplete = (0, external_react_.useCallback)(()=>{
        if (agent.getState().senderSending) agent.getState().setSenderSending(false);
        if (agent.getState().senderStopping) agent.getState().setSenderStopping(false);
    }, []);
    const chunkTimer = (0, external_react_.useRef)(null);
    const handleResponse = (0, external_react_.useCallback)(async (response, onTimeout, onComplete)=>{
        for await (const chunk of XStream({
            readableStream: response.body
        }))handleChunk(chunk.data);
        onComplete();
    }, [
        handleChunk
    ]);
    const handleRetryMax = (0, external_react_.useCallback)(()=>{
        console.error("send-continue \u8FBE\u5230\u6700\u5927\u91CD\u8BD5\u6B21\u6570\uFF0C\u505C\u6B62\u91CD\u8BD5");
        agent.getState().addChunk({
            id: Date.now().toString(),
            role: 'assistant',
            type: 'error',
            content: `send-continue \u{5931}\u{8D25}\u{FF0C}\u{5DF2}\u{91CD}\u{8BD5} ${MAX_RETRY_COUNT} \u{6B21}`
        });
        onSendComplete();
    }, [
        onSendComplete
    ]);
    const sendContinue = (0, external_react_.useCallback)(async (retryCount = 0)=>{
        agent.getState().setSenderLoading(true);
        const chunks = agent.getState().chunks;
        try {
            var _useAgentStore_getState_abortController, _chunks_;
            null == (_useAgentStore_getState_abortController = agent.getState().abortController) || _useAgentStore_getState_abortController.abort();
            const abortController = new AbortController();
            agent.getState().setAbortController(abortController);
            agent.getState().setSenderSending(true);
            const response = await fetch(`${agent.getState().requestPrefix}/api/v1/sessions/${sessionIdRef.current}/send-continue`, {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    language: useTranslation_getLanguage()
                },
                body: JSON.stringify({
                    chunk_id: (null == (_chunks_ = chunks[chunks.length - 1]) ? void 0 : _chunks_.id) || ''
                }),
                signal: abortController.signal
            });
            agent.getState().setSenderLoading(false);
            if (!response.ok) {
                agent.getState().addChunk({
                    id: Date.now().toString(),
                    role: 'assistant',
                    type: 'error',
                    content: 'Failed to fetch'
                });
                throw new Error('Failed to fetch');
            }
            handleResponse(response, ()=>{
                if (retryCount < MAX_RETRY_COUNT) sendContinue(retryCount + 1);
                else handleRetryMax();
            }, onSendComplete);
        } catch (error) {
            agent.getState().setSenderLoading(false);
            if ('AbortError' === error.name) return void console.error('Request was aborted by user');
            console.error('send-continue error', error);
            if (retryCount < MAX_RETRY_COUNT) {
                if (chunkTimer.current) {
                    clearTimeout(chunkTimer.current);
                    chunkTimer.current = null;
                }
                chunkTimer.current = setTimeout(()=>{
                    sendContinue(retryCount + 1);
                }, RETRY_DELAY);
            } else handleRetryMax();
        }
    }, [
        handleResponse,
        handleRetryMax,
        onSendComplete
    ]);
    const loadSessionData = (0, external_react_.useCallback)(async (sessionId)=>{
        try {
            const data = await getSession(sessionId);
            const session = data.session_info;
            const sessionChunks = data.messages.reverse();
            agent.getState().setSessionInfo(session);
            agent.getState().setChunks([
                ...sessionChunks
            ]);
            const newMessages = transformChunksToMessages(sessionChunks);
            if (newMessages.length > 0) {
                const lastMessage = newMessages[newMessages.length - 1];
                if ('assistant' === lastMessage.role && !isMessageFinish(lastMessage)) sendContinue(0);
            }
        } catch (error) {
            console.error('Failed to load session data:', error);
        }
    }, [
        sendContinue
    ]);
    const send = (0, external_react_.useCallback)(async ({ content, files = [], mcpTools = [], knowledgeBases = [] })=>{
        agent.getState().setSenderLoading(true);
        try {
            var _pipelineMessages__messages, _pipelineMessages_, _pipelineMessages__messages1, _pipelineMessages_1, _useAgentStore_getState_abortController, _userInputChunk_detail, _previousMessage_detail, _previousMessage_detail1;
            const pipelineMessages = agent.getState().pipelineMessages;
            const userInputChunk = null == (_pipelineMessages_ = pipelineMessages[pipelineMessages.length - 1]) ? void 0 : null == (_pipelineMessages__messages = _pipelineMessages_.messages) ? void 0 : _pipelineMessages__messages.find((msg)=>'user_input' === msg.type);
            const previousMessage = null == (_pipelineMessages_1 = pipelineMessages[pipelineMessages.length - 2]) ? void 0 : null == (_pipelineMessages__messages1 = _pipelineMessages_1.messages) ? void 0 : _pipelineMessages__messages1[0];
            agent.getState().addChunk({
                id: 'fake-' + Date.now().toString(),
                type: 'text',
                role: 'user',
                content,
                timestamp: Date.now(),
                detail: {
                    attachments: files.map((item)=>({
                            filename: item.name,
                            path: item.key,
                            url: item.url,
                            size: item.size,
                            content_type: item.type,
                            show_user: 1
                        }))
                }
            });
            null == (_useAgentStore_getState_abortController = agent.getState().abortController) || _useAgentStore_getState_abortController.abort();
            const abortController = new AbortController();
            agent.getState().setAbortController(abortController);
            agent.getState().setSenderSending(true);
            const response = await fetch(`${agent.getState().requestPrefix}/api/v1/chat`, {
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                    language: useTranslation_getLanguage()
                },
                body: JSON.stringify({
                    session_id: sessionIdRef.current,
                    message: content,
                    files,
                    ...(null == userInputChunk ? void 0 : null == (_userInputChunk_detail = userInputChunk.detail) ? void 0 : _userInputChunk_detail.interrupt_data) ? {
                        interrupt_data: {
                            ...userInputChunk.detail.interrupt_data,
                            content: null == previousMessage ? void 0 : previousMessage.content,
                            files: (null == previousMessage ? void 0 : null == (_previousMessage_detail = previousMessage.detail) ? void 0 : _previousMessage_detail.attachments) || (null == previousMessage ? void 0 : null == (_previousMessage_detail1 = previousMessage.detail) ? void 0 : _previousMessage_detail1.files)
                        }
                    } : {}
                }),
                method: 'POST',
                signal: abortController.signal
            });
            agent.getState().setSenderLoading(false);
            if (!response.ok) {
                agent.getState().addChunk({
                    id: Date.now().toString(),
                    role: 'assistant',
                    type: 'error',
                    content: 'Failed to fetch'
                });
                throw new Error('Failed to fetch');
            }
            handleResponse(response, ()=>{}, onSendComplete);
        } catch (error) {
            agent.getState().setSenderLoading(false);
            if ('AbortError' === error.name) return void console.error('Request was aborted by user');
            console.error('Send error:', error);
            external_antd_message.error(error.message);
            onSendComplete();
        }
    }, [
        handleResponse,
        onSendComplete
    ]);
    const stop = (0, external_react_.useCallback)(()=>{
        agent.getState().setSenderStopping(true);
        api_sessionApi.stopTask(sessionIdRef.current);
    }, []);
    (0, external_react_.useEffect)(()=>{
        basePathRef.current = basePath;
        agentIdRef.current = agentId;
        sessionIdRef.current = sessionId;
    }, [
        basePath,
        agentId,
        sessionId
    ]);
    (0, external_react_.useEffect)(()=>{
        const handleUserInputClick = (option)=>{
            send({
                content: option
            });
        };
        utils_eventBus.on('user_input_click', handleUserInputClick);
        return ()=>{
            utils_eventBus.off('user_input_click', handleUserInputClick);
        };
    }, [
        send
    ]);
    (0, external_react_.useEffect)(()=>{
        if (agent.getState().isNavigating) {
            devLog("\u8DF3\u8F6C\u9875\u9762\uFF0C\u4E0D\u52A0\u8F7D\u6570\u636E");
            agent.getState().setIsNavigating(false);
            return;
        }
        if (agent.getState().previousSessionId === sessionId) return void devLog("sessionId \u6CA1\u6709\u53D8\u5316\uFF0C\u4E0D\u52A0\u8F7D\u6570\u636E");
        agent.getState().setPreviousSessionId(sessionId);
        if (sessionId) devLog("\u52A0\u8F7D session \u6570\u636E", sessionId);
        else {
            devLog("\u6CA1\u6709sessionId, reset store");
            agent.getState().resetStore();
        }
    }, [
        loadSessionData,
        sessionId
    ]);
    return {
        send,
        stop
    };
};
const useChat = useChat_useChat;
const linkSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 13 20",
        fill: "none",
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("g", {
                clipPath: "url(#clip0_10894_15136)",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
                    d: "M6.50036 20C4.77693 19.998 3.125 19.3 1.90672 18.06C0.687504 16.819 0.00314668 15.137 0.000360965 13.383V4.82797C-0.0073353 4.19489 0.108117 3.5671 0.33929 2.98497C0.573913 2.39452 0.917285 1.86144 1.34865 1.41797C1.78952 0.96475 2.30799 0.608138 2.87522 0.367967C4.03507 -0.12526 5.32565 -0.12526 6.4855 0.367967C7.0575 0.611967 7.57565 0.967967 8.01115 1.41797C8.44665 1.86797 8.79022 2.39997 9.02143 2.98497C9.25357 3.57097 9.36779 4.19697 9.35943 4.82797V13.383C9.35129 13.7654 9.27141 14.1421 9.1246 14.4905C8.97779 14.8388 8.76709 15.1516 8.50515 15.41C7.95832 15.9502 7.2424 16.2483 6.50036 16.245C5.751 16.245 5.03136 15.945 4.4965 15.41C4.23456 15.1516 4.02385 14.8388 3.87704 14.4905C3.73024 14.1421 3.65036 13.7654 3.64222 13.383V7.16297C3.63806 7.01327 3.66185 6.8642 3.71217 6.72458C3.7625 6.58497 3.83834 6.45765 3.93519 6.35018C4.03204 6.24271 4.14795 6.15727 4.27603 6.09893C4.40411 6.04058 4.54176 6.01052 4.68082 6.01052C4.81989 6.01052 4.95754 6.04058 5.08562 6.09893C5.2137 6.15727 5.3296 6.24271 5.42646 6.35018C5.52331 6.45765 5.59915 6.58497 5.64947 6.72458C5.6998 6.8642 5.72359 7.01327 5.71943 7.16297V13.383C5.72315 13.4866 5.74609 13.5884 5.78692 13.6824C5.82775 13.7763 5.88563 13.8605 5.95715 13.93C6.10601 14.0748 6.29971 14.1547 6.50036 14.154C6.70372 14.154 6.89872 14.074 7.0445 13.93C7.11591 13.8606 7.17373 13.7766 7.21455 13.6828C7.25537 13.5891 7.27838 13.4874 7.28222 13.384V4.82797C7.28808 4.47515 7.22513 4.12494 7.09743 3.79997C6.96762 3.47 6.7768 3.17195 6.53657 2.92397C6.29145 2.67073 6.00286 2.47135 5.68693 2.33697C5.04033 2.06109 4.32039 2.06109 3.67379 2.33697C3.35753 2.47123 3.06861 2.67062 2.82322 2.92397C2.58299 3.17195 2.39217 3.47 2.26236 3.79997C2.13498 4.12501 2.07235 4.47522 2.0785 4.82797V13.383C2.0785 14.577 2.54372 15.722 3.37293 16.566C4.22137 17.4185 5.33994 17.8903 6.50036 17.885C7.66046 17.8901 8.77866 17.4183 9.62686 16.566C10.0329 16.1586 10.3573 15.6661 10.5801 15.1187C10.8028 14.5713 10.9193 13.9806 10.9222 13.383V7.16297C10.9303 6.87211 11.0433 6.59608 11.2372 6.39342C11.431 6.19076 11.6906 6.07741 11.9608 6.07741C12.231 6.07741 12.4906 6.19076 12.6845 6.39342C12.8784 6.59608 12.9914 6.87211 12.9994 7.16297V13.383C12.9976 15.137 12.3123 16.819 11.094 18.06C9.87572 19.3 8.22379 19.998 6.50036 20Z",
                    fill: "currentColor"
                })
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("defs", {
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("clipPath", {
                    id: "clip0_10894_15136",
                    children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("rect", {
                        width: "13",
                        height: "20",
                        fill: "white"
                    })
                })
            })
        ]
    });
const databaseSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 20 20",
        fill: "none",
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("g", {
                clipPath: "url(#clip0_10894_15131)",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
                    d: "M3 10.5001C3 10.813 3.461 11.3581 4.53 11.893C5.914 12.5851 7.877 13 10 13C12.123 13 14.086 12.5851 15.47 11.893C16.539 11.3581 17 10.813 17 10.5001V8.32902C15.35 9.34902 12.827 10 10 10C7.173 10 4.65 9.34802 3 8.32902V10.5001ZM17 13.3291C15.35 14.3491 12.827 15.0001 10 15.0001C7.173 15.0001 4.65 14.348 3 13.3291V15.5C3 15.8131 3.461 16.358 4.53 16.8931C5.914 17.585 7.877 18.0001 10 18.0001C12.123 18.0001 14.086 17.585 15.47 16.8931C16.539 16.358 17 15.8131 17 15.5V13.3291ZM1 15.5V5.50001C1 3.01501 5.03 1 10 1C14.97 1 19 3.01501 19 5.50001V15.5C19 17.9851 14.97 20 10 20C5.03 20 1 17.9851 1 15.5ZM10 8.00001C12.123 8.00001 14.086 7.58501 15.47 6.89301C16.538 6.35801 17 5.81301 17 5.50001C17 5.18701 16.539 4.64201 15.47 4.10701C14.085 3.41501 12.123 3.00001 10 3.00001C7.877 3.00001 5.914 3.41501 4.53 4.10701C3.461 4.64201 3 5.18701 3 5.50001C3 5.81301 3.461 6.35801 4.53 6.89301C5.914 7.58501 7.877 8.00001 10 8.00001Z",
                    fill: "currentColor",
                    stroke: "currentColor",
                    strokeWidth: "0.1"
                })
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("defs", {
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("clipPath", {
                    id: "clip0_10894_15131",
                    children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("rect", {
                        width: "20",
                        height: "20",
                        fill: "white"
                    })
                })
            })
        ]
    });
const onlineSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 20 20",
        fill: "none",
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("g", {
                clipPath: "url(#clip0_10894_15080)",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
                        d: "M10 19C14.9706 19 19 14.9706 19 10C19 5.02944 14.9706 1 10 1C5.02944 1 1 5.02944 1 10C1 14.9706 5.02944 19 10 19Z",
                        stroke: "currentColor",
                        strokeWidth: "1.8"
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
                        d: "M1 10H19M10 1C11.657 1 13 5.03 13 10C13 14.97 11.657 19 10 19C8.343 19 7 14.97 7 10C7 5.03 8.343 1 10 1Z",
                        stroke: "currentColor",
                        strokeWidth: "1.8"
                    })
                ]
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("defs", {
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("clipPath", {
                    id: "clip0_10894_15080",
                    children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("rect", {
                        width: "20",
                        height: "20",
                        fill: "white"
                    })
                })
            })
        ]
    });
const mcpSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 20 20",
        fill: "none",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            d: "M11.25 0.625C11.6604 0.625 12.0671 0.706235 12.4463 0.863281C12.8252 1.02032 13.1699 1.24998 13.46 1.54004C13.75 1.8301 13.9797 2.17476 14.1367 2.55371C14.2938 2.93285 14.375 3.33962 14.375 3.75H17.5C17.8315 3.75 18.1494 3.88179 18.3838 4.11621C18.6182 4.35063 18.75 4.66848 18.75 5V17.5C18.75 17.8315 18.6182 18.1494 18.3838 18.3838C18.1494 18.6182 17.8315 18.75 17.5 18.75H12.9248V16.7129C12.9249 16.2873 12.7665 15.8767 12.4805 15.5615C12.1945 15.2464 11.8015 15.0489 11.3779 15.0078L11.2129 15C10.7587 15 10.3231 15.1808 10.002 15.502C9.6808 15.8231 9.5 16.2587 9.5 16.7129V18.75H5C4.66848 18.75 4.35063 18.6182 4.11621 18.3838C3.88179 18.1494 3.75 17.8315 3.75 17.5V14.375C2.9212 14.375 2.12609 14.046 1.54004 13.46C0.953988 12.8739 0.625 12.0788 0.625 11.25C0.625 10.4212 0.953988 9.62609 1.54004 9.04004C2.12609 8.45399 2.9212 8.125 3.75 8.125V5C3.75 4.66848 3.88179 4.35063 4.11621 4.11621C4.35063 3.88179 4.66848 3.75 5 3.75H8.125C8.125 2.9212 8.45399 2.12609 9.04004 1.54004C9.62609 0.953988 10.4212 0.625 11.25 0.625ZM11.25 2.0752C10.325 2.0752 9.5752 2.825 9.5752 3.75V5.2002H5.4502C5.38389 5.2002 5.32032 5.22655 5.27344 5.27344C5.22655 5.32032 5.2002 5.38389 5.2002 5.4502V9.5752H3.75C3.30576 9.5752 2.87955 9.75131 2.56543 10.0654C2.25131 10.3796 2.0752 10.8058 2.0752 11.25C2.0752 11.6942 2.25131 12.1204 2.56543 12.4346C2.87955 12.7487 3.30576 12.9248 3.75 12.9248H5.2002V17.0498C5.2002 17.1873 5.3127 17.2998 5.4502 17.2998H8.0498V16.7129C8.0498 15.0366 9.35543 13.6636 11.0654 13.5586L11.2812 13.5508L11.5146 13.5635C12.2975 13.6387 13.0249 14.0029 13.5537 14.585C14.0825 15.1672 14.3752 15.9264 14.375 16.7129V17.2998H17.0498C17.1161 17.2998 17.1797 17.2734 17.2266 17.2266C17.2734 17.1797 17.2998 17.1161 17.2998 17.0498V5.4502C17.2998 5.38389 17.2734 5.32032 17.2266 5.27344C17.1797 5.22655 17.1161 5.2002 17.0498 5.2002H12.9248V3.75C12.9248 2.825 12.175 2.0752 11.25 2.0752ZM11 6C11.4142 6 11.75 6.33579 11.75 6.75V8.25H13.25C13.6642 8.25 14 8.58579 14 9C14 9.41421 13.6642 9.75 13.25 9.75H11.75V11.25C11.75 11.6642 11.4142 12 11 12C10.5858 12 10.25 11.6642 10.25 11.25V9.75H8.75C8.33579 9.75 8 9.41421 8 9C8 8.58579 8.33579 8.25 8.75 8.25H10.25V6.75C10.25 6.33579 10.5858 6 11 6Z",
            fill: "currentColor"
        })
    });
const stepBackwardSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 20 20",
        fill: "none",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            d: "M6.2513 14.1667V5.83333C6.2513 5.59722 6.17144 5.39931 6.01172 5.23958C5.852 5.07986 5.65408 5 5.41797 5C5.18186 5 4.98394 5.07986 4.82422 5.23958C4.6645 5.39931 4.58464 5.59722 4.58464 5.83333V14.1667C4.58464 14.4028 4.6645 14.6007 4.82422 14.7604C4.98394 14.9201 5.18186 15 5.41797 15C5.65408 15 5.852 14.9201 6.01172 14.7604C6.17144 14.6007 6.2513 14.4028 6.2513 14.1667ZM15.418 13.4375V6.5625C15.418 6.3125 15.3346 6.11111 15.168 5.95833C15.0013 5.80556 14.8069 5.72917 14.5846 5.72917C14.5152 5.72917 14.4388 5.73611 14.3555 5.75C14.2721 5.76389 14.1957 5.79861 14.1263 5.85417L8.95964 9.3125C8.83464 9.39583 8.74089 9.49653 8.67839 9.61458C8.61589 9.73264 8.58464 9.86111 8.58464 10C8.58464 10.1389 8.61589 10.2674 8.67839 10.3854C8.74089 10.5035 8.83464 10.6042 8.95964 10.6875L14.1263 14.1458C14.1957 14.2014 14.2721 14.2361 14.3555 14.25C14.4388 14.2639 14.5152 14.2708 14.5846 14.2708C14.8069 14.2708 15.0013 14.1944 15.168 14.0417C15.3346 13.8889 15.418 13.6875 15.418 13.4375Z",
            fill: "currentColor"
        })
    });
const stepForwardSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 20 20",
        fill: "none",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            d: "M13.7487 14.1667V5.83333C13.7487 5.59722 13.8286 5.39931 13.9883 5.23958C14.148 5.07986 14.3459 5 14.582 5C14.8181 5 15.0161 5.07986 15.1758 5.23958C15.3355 5.39931 15.4154 5.59722 15.4154 5.83333V14.1667C15.4154 14.4028 15.3355 14.6007 15.1758 14.7604C15.0161 14.9201 14.8181 15 14.582 15C14.3459 15 14.148 14.9201 13.9883 14.7604C13.8286 14.6007 13.7487 14.4028 13.7487 14.1667ZM4.58203 13.4375V6.5625C4.58203 6.3125 4.66536 6.11111 4.83203 5.95833C4.9987 5.80556 5.19314 5.72917 5.41536 5.72917C5.48481 5.72917 5.5612 5.73611 5.64453 5.75C5.72786 5.76389 5.80425 5.79861 5.8737 5.85417L11.0404 9.3125C11.1654 9.39583 11.2591 9.49653 11.3216 9.61458C11.3841 9.73264 11.4154 9.86111 11.4154 10C11.4154 10.1389 11.3841 10.2674 11.3216 10.3854C11.2591 10.5035 11.1654 10.6042 11.0404 10.6875L5.8737 14.1458C5.80425 14.2014 5.72786 14.2361 5.64453 14.25C5.5612 14.2639 5.48481 14.2708 5.41536 14.2708C5.19314 14.2708 4.9987 14.1944 4.83203 14.0417C4.66536 13.8889 4.58203 13.6875 4.58203 13.4375Z",
            fill: "currentColor"
        })
    });
const caretRightSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 13 15",
        fill: "none",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            d: "M0.789062 12.875V1.84375C0.789062 1.41146 0.898438 1.09115 1.11719 0.882812C1.33594 0.674479 1.59635 0.570312 1.89844 0.570312C2.16927 0.570312 2.4401 0.645833 2.71094 0.796875L11.9375 6.1875C12.2708 6.38021 12.5104 6.5625 12.6562 6.73438C12.8073 6.90625 12.8828 7.11458 12.8828 7.35938C12.8828 7.59896 12.8073 7.80729 12.6562 7.98438C12.5104 8.15625 12.2708 8.33854 11.9375 8.53125L2.71094 13.9219C2.4401 14.0729 2.16927 14.1484 1.89844 14.1484C1.59635 14.1484 1.33594 14.0417 1.11719 13.8281C0.898438 13.6198 0.789062 13.3021 0.789062 12.875Z",
            fill: "currentColor"
        })
    });
const phoneBackSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 20 20",
        fill: "none",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            d: "M15.4902 4.72493H7.15039V3.27961C7.15039 3.14875 7 3.07649 6.89844 3.15657L4.125 5.34407C4.04492 5.40657 4.04492 5.52766 4.125 5.59016L6.89844 7.77766C7 7.85774 7.15039 7.78547 7.15039 7.65461V6.2093H15.2559V15.389H3.41992C3.33398 15.389 3.26367 15.4593 3.26367 15.5452V16.7171C3.26367 16.803 3.33398 16.8734 3.41992 16.8734H15.4902C16.1797 16.8734 16.7402 16.3128 16.7402 15.6234V5.97493C16.7402 5.28547 16.1797 4.72493 15.4902 4.72493Z",
            fill: "currentColor"
        })
    });
const phoneHomeSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 20 20",
        fill: "none",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            d: "M10.7347 2.59805L16.9785 6.57472C17.1747 6.69968 17.3362 6.87208 17.4482 7.076C17.5601 7.27991 17.6189 7.50876 17.619 7.74139V16.2352C17.6188 16.417 17.5829 16.5971 17.5132 16.7651C17.4435 16.933 17.3414 17.0856 17.2127 17.2141C17.084 17.3426 16.9313 17.4445 16.7632 17.514C16.5952 17.5834 16.4151 17.6191 16.2332 17.619H10.7094L10.7099 13.359H9.30705V17.6185L3.76657 17.619C3.58472 17.6191 3.40463 17.5834 3.23658 17.514C3.06852 17.4445 2.9158 17.3426 2.78712 17.2141C2.65844 17.0856 2.55634 16.933 2.48663 16.7651C2.41693 16.5971 2.38098 16.417 2.38086 16.2352V7.62186C2.38086 7.14281 2.62848 6.69805 3.0361 6.44567L9.25991 2.58853C9.48171 2.45117 9.73778 2.3792 9.99866 2.38089C10.2595 2.38257 10.5147 2.45785 10.7347 2.59805ZM16.1904 16.1904V7.75805L9.98991 3.80948L3.80943 7.639V16.1904H7.93657V11.9609H12.0809V16.19L16.1904 16.1904Z",
            fill: "currentColor"
        })
    });
const phoneMenuSvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 20 20",
        fill: "none",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            d: "M11.6895 14.6855C11.9316 14.1348 12.4824 13.748 13.123 13.748C13.7637 13.748 14.3145 14.1348 14.5566 14.6855H17.498C17.8418 14.6855 18.1231 14.9668 18.1231 15.3105C18.1231 15.6543 17.8418 15.9355 17.498 15.9355H14.5566C14.3145 16.4863 13.7637 16.873 13.123 16.873C12.4824 16.873 11.9316 16.4863 11.6895 15.9355H2.49805C2.1543 15.9355 1.87305 15.6543 1.87305 15.3105C1.87305 14.9668 2.1543 14.6855 2.49805 14.6855H11.6895ZM5.43945 9.37305C5.68164 8.82227 6.23242 8.43555 6.87305 8.43555C7.51367 8.43555 8.06445 8.82227 8.30664 9.37305H17.498C17.8418 9.37305 18.1231 9.6543 18.1231 9.99805C18.1231 10.3418 17.8418 10.623 17.498 10.623H8.30664C8.06445 11.1738 7.51367 11.5605 6.87305 11.5605C6.23242 11.5605 5.68164 11.1738 5.43945 10.623H2.49805C2.1543 10.623 1.87305 10.3418 1.87305 9.99805C1.87305 9.6543 2.1543 9.37305 2.49805 9.37305H5.43945ZM11.6895 4.06055C11.9316 3.50977 12.4824 3.12305 13.123 3.12305C13.7637 3.12305 14.3145 3.50977 14.5566 4.06055H17.498C17.8418 4.06055 18.1231 4.3418 18.1231 4.68555C18.1231 5.0293 17.8418 5.31055 17.498 5.31055H14.5566C14.3145 5.86133 13.7637 6.24805 13.123 6.24805C12.4824 6.24805 11.9316 5.86133 11.6895 5.31055H2.49805C2.1543 5.31055 1.87305 5.0293 1.87305 4.68555C1.87305 4.3418 2.1543 4.06055 2.49805 4.06055H11.6895Z",
            fill: "currentColor"
        })
    });
const svgMap = {
    database: databaseSvg,
    link: linkSvg,
    online: onlineSvg,
    mcp: mcpSvg,
    stepBackward: stepBackwardSvg,
    stepForward: stepForwardSvg,
    caretRight: caretRightSvg,
    phoneBack: phoneBackSvg,
    phoneHome: phoneHomeSvg,
    phoneMenu: phoneMenuSvg
};
const CustomIcon_CustomIcon = ({ type, className = '', onClick, onMouseDown, ...otherProps })=>{
    const iconRender = ()=>{
        const events = {
            onClick,
            onMouseDown
        };
        return /*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
            className: classnames({
                'flex justify-start items-center': true,
                [className]: true
            }),
            component: svgMap[type],
            ...events,
            ...otherProps
        });
    };
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "flex justify-center items-center",
        children: iconRender()
    });
};
const components_CustomIcon = CustomIcon_CustomIcon;
const FileList_FileList = ({ fileList, onRemove })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "flex flex-wrap gap-[12px]",
        children: fileList.map((item, index)=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "relative group",
                children: [
                    'done' === item.status ? /*#__PURE__*/ (0, jsx_runtime_.jsx)(Attachments.FileCard, {
                        item: item
                    }) : /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: "w-[68px] h-[68px] bg-black/[0.06] rounded-[6px] flex items-center justify-center",
                        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(LoadingOutlined, {})
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 hidden group-hover:block p-[4px] cursor-pointer",
                        onClick: ()=>onRemove(item.uid),
                        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                            className: "flex items-center justify-center w-[14px] h-[14px] text-[8px] text-white bg-black/[0.5] hover:bg-black rounded-full ",
                            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(CloseOutlined, {})
                        })
                    })
                ]
            }, index))
    });
const FileList = FileList_FileList;
import "./static/svg/checked.svg";
const getToolName = (item)=>{
    const lang = useTranslation_getLanguage();
    if ('en' === lang) {
        var _item_ext;
        return (null == (_item_ext = item.ext) ? void 0 : _item_ext.name_en) || item.tool_name_en;
    }
    return item.name || item.tool_name;
};
const isKnowledgeBaseItem = (item)=>item && 'object' == typeof item && 'knowledge_id' in item;
const isSandboxToolItem = (item)=>item && 'object' == typeof item && 'agent_tool_id' in item && 'status' in item;
const isMCPToolItem = (item)=>item && 'object' == typeof item && 'id' in item && !('agent_tool_id' in item);
const ToolItem = ({ item, index })=>{
    let icon;
    let name;
    if (isKnowledgeBaseItem(item)) {
        icon = void 0;
        name = item.name;
    } else if (isSandboxToolItem(item)) {
        icon = item.avatar;
        name = getToolName(item);
    } else if (isMCPToolItem(item)) {
        icon = item.icon;
        name = getToolName(item);
    } else {
        icon = (null == item ? void 0 : item.icon) || (null == item ? void 0 : item.avatar);
        name = getToolName(item);
    }
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "flex items-center w-[120px]",
        children: [
            icon && /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "w-[16px] mr-[4px] shrink-0",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
                    className: "h-[16px] w-[16px] rounded-[3px] border border-[rgba(82,100,154,0.03)]",
                    src: icon,
                    alt: name
                })
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "flex-1 text-[14px] line-clamp-1",
                title: name,
                children: name
            })
        ]
    }, index);
};
const components_ToolItem = ToolItem;
const MAX_CONTENT_LENGTH = 3000;
const SenderContainer = ()=>{
    const { t } = useTranslation_useTranslation();
    const [headerOpen, setHeaderOpen] = (0, external_react_.useState)(false);
    const [knowledgeBaseOpen, setKnowledgeBaseOpen] = (0, external_react_.useState)(false);
    const [mcpToolOpen, setMcpToolOpen] = (0, external_react_.useState)(false);
    const { basePath, agentId, sessionId, sessionInfo, senderLoading, setSenderLoading, senderContent, setSenderContent, senderFiles, setSenderFiles, senderKnowledgeBases, selectedSenderKnowledgeBases, setSelectedSenderKnowledgeBases, senderMCPTools, senderSandboxTools, selectedSenderMCPTools, setSelectedSenderMCPTools, senderStopping, setSenderStopping, senderSending } = agent();
    const sessionActive = (0, external_react_.useMemo)(()=>(null == sessionInfo ? void 0 : sessionInfo.status) !== 'ARCHIVED', [
        null == sessionInfo ? void 0 : sessionInfo.status
    ]);
    const { send, stop } = useChat(basePath, agentId, sessionId);
    const clearState = (0, external_react_.useCallback)(()=>{
        setSenderContent('');
        setSenderFiles([]);
        setHeaderOpen(false);
    }, [
        setSenderContent,
        setSenderFiles,
        setHeaderOpen
    ]);
    const handleSend = (0, external_react_.useCallback)(()=>{
        if (0 === senderContent.length || senderContent.length > MAX_CONTENT_LENGTH || senderLoading) return;
        send({
            content: senderContent,
            ...(null == senderFiles ? void 0 : senderFiles.length) && {
                files: senderFiles
            },
            ...(null == selectedSenderKnowledgeBases ? void 0 : selectedSenderKnowledgeBases.length) && {
                knowledgeBases: selectedSenderKnowledgeBases
            },
            ...(null == selectedSenderMCPTools ? void 0 : selectedSenderMCPTools.length) && {
                mcpTools: selectedSenderMCPTools
            }
        });
        clearState();
    }, [
        clearState,
        selectedSenderKnowledgeBases,
        selectedSenderMCPTools,
        send,
        senderContent,
        senderFiles,
        senderLoading
    ]);
    const handleCancel = (0, external_react_.useCallback)(()=>{
        stop();
        setSenderStopping(true);
    }, [
        stop,
        setSenderStopping
    ]);
    const handleRemoveFile = (0, external_react_.useCallback)((uid)=>{
        setSenderFiles((pre)=>pre.filter((item)=>item.uid !== uid));
        if (1 === senderFiles.length) setHeaderOpen(false);
    }, [
        senderFiles,
        setSenderFiles
    ]);
    (0, external_react_.useCallback)((params)=>{
        setHeaderOpen(true);
        setSenderFiles((pre)=>[
                ...pre,
                params
            ]);
    }, [
        setSenderFiles
    ]);
    (0, external_react_.useCallback)((params)=>{
        setSenderFiles((pre)=>{
            const index = pre.findIndex((item)=>item.uid === params.uid);
            if (-1 !== index) if ('error' === params.status) return pre.filter((item)=>item.uid !== params.uid);
            else {
                const newPre = [
                    ...pre
                ];
                newPre[index] = params;
                return newPre;
            }
            return pre;
        });
    }, [
        setSenderFiles
    ]);
    const updateSelectedItems = (0, external_react_.useCallback)((session)=>{
        var _session_kb_info, _session_agent_tool_info;
        const sessionKbIds = null == session ? void 0 : null == (_session_kb_info = session.kb_info) ? void 0 : _session_kb_info.kb_ids;
        if ((null == sessionKbIds ? void 0 : sessionKbIds.length) && (null == senderKnowledgeBases ? void 0 : senderKnowledgeBases.length)) {
            const selectedKnowledgeBases = senderKnowledgeBases.filter((item)=>sessionKbIds.includes(item.knowledge_id));
            setSelectedSenderKnowledgeBases(selectedKnowledgeBases);
        }
        const sessionToolItems = (null == session ? void 0 : null == (_session_agent_tool_info = session.agent_tool_info) ? void 0 : _session_agent_tool_info.agent_tool_items) || [];
        const sessionMcpToolItems = sessionToolItems.filter((item)=>'MCP' === item.agent_tool_type);
        const sessionAgentToolItems = sessionToolItems.filter((item)=>'SANDBOX' === item.agent_tool_type);
        if ((null == sessionMcpToolItems ? void 0 : sessionMcpToolItems.length) && (null == senderMCPTools ? void 0 : senderMCPTools.length) || (null == sessionAgentToolItems ? void 0 : sessionAgentToolItems.length) && (null == senderSandboxTools ? void 0 : senderSandboxTools.length)) {
            const selectedMCPTools = (null == senderMCPTools ? void 0 : senderMCPTools.filter((item)=>sessionMcpToolItems.some((tool)=>tool.agent_tool_id === item.id))) || [];
            const selectedSandboxTools = (null == senderSandboxTools ? void 0 : senderSandboxTools.filter((item)=>sessionAgentToolItems.some((tool)=>tool.agent_tool_id === item.agent_tool_id))) || [];
            setSelectedSenderMCPTools([
                ...selectedMCPTools,
                ...selectedSandboxTools
            ]);
        }
    }, [
        senderKnowledgeBases,
        senderMCPTools,
        senderSandboxTools,
        setSelectedSenderKnowledgeBases,
        setSelectedSenderMCPTools
    ]);
    (0, external_react_.useEffect)(()=>{
        if (sessionInfo) updateSelectedItems(sessionInfo);
        return ()=>{
            if (sessionInfo) {
                setSelectedSenderKnowledgeBases([]);
                setSelectedSenderMCPTools((null == senderSandboxTools ? void 0 : senderSandboxTools.filter((item)=>'ACTIVE' === item.status)) || []);
            }
        };
    }, [
        sessionInfo,
        senderSandboxTools,
        updateSelectedItems,
        setSelectedSenderKnowledgeBases,
        setSelectedSenderMCPTools
    ]);
    const headerNode = /*#__PURE__*/ (0, jsx_runtime_.jsx)(Sender.Header, {
        title: "Attachments",
        open: headerOpen,
        onOpenChange: setHeaderOpen,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(FileList, {
            fileList: senderFiles,
            onRemove: handleRemoveFile
        })
    });
    (0, external_react_.useCallback)((config)=>{
        const { selectedItems, iconType, onClick } = config;
        if (sessionId && 0 === selectedItems.length) return null;
        if (0 === selectedItems.length) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
            shape: "circle",
            icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_CustomIcon, {
                type: iconType
            }),
            disabled: !sessionActive,
            style: {
                fontSize: '18px',
                width: '36px',
                height: '36px'
            },
            onClick: onClick
        });
        const getSelectedItemsDisplay = (iconType, selectedItems)=>{
            if ('mcp' !== iconType) return [
                {
                    title: t('sender.mcp.selected.knowledge-base'),
                    content: selectedItems
                }
            ];
            const serviceGroups = [
                {
                    title: t('sender.mcp.selected.mcp-service'),
                    filter: (item)=>void 0 === item.tool_type
                },
                {
                    title: t('sender.mcp.selected.sandbox'),
                    filter: (item)=>'SANDBOX' === item.tool_type
                }
            ];
            return serviceGroups.map((group)=>({
                    title: group.title,
                    content: selectedItems.filter(group.filter)
                })).filter((group)=>group.content.length > 0);
        };
        const selectedItemsDisplay = getSelectedItemsDisplay(iconType, selectedItems);
        return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Popover, {
            placement: "top",
            arrow: false,
            content: /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "flex flex-col gap-[16px]",
                children: selectedItemsDisplay.map((item, index)=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                        className: "flex flex-col gap-[12px]",
                        children: [
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                className: "text-[12px] text-[#999] leading-[12px]",
                                children: item.title
                            }),
                            item.content.map((item, index)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(components_ToolItem, {
                                    item: item,
                                    index: index
                                }, item.knowledge_id || item.id || index))
                        ]
                    }, index))
            }),
            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_CustomIcon, {
                    type: iconType,
                    className: "text-[20px]"
                }),
                disabled: !sessionActive || !!selectedItems.length && !!sessionId,
                style: {
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '20px'
                },
                size: "large",
                onClick: onClick,
                children: selectedItems.length
            })
        });
    }, [
        sessionActive,
        sessionId,
        t
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "agentx-sender w-full bg-white rounded-[24px]",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Sender, {
            value: senderContent,
            disabled: !sessionActive,
            autoSize: {
                minRows: 2,
                maxRows: 3
            },
            placeholder: t('sender.placeholder'),
            onChange: setSenderContent,
            onSubmit: handleSend,
            actions: false,
            header: headerNode,
            footer: ({ components })=>{
                const { SendButton } = components;
                return /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
                    justify: "space-between",
                    align: "center",
                    children: [
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {}),
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(Flex, {
                            align: "center",
                            gap: 12,
                            children: senderSending ? /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Tooltip, {
                                title: "Stop",
                                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                                    type: "primary",
                                    shape: "circle",
                                    style: {
                                        width: '36px',
                                        height: '36px'
                                    },
                                    onClick: handleCancel,
                                    loading: senderStopping,
                                    children: !senderStopping && /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                        className: "w-[14px] h-[14px] bg-white rounded-[4px]"
                                    })
                                })
                            }) : /*#__PURE__*/ (0, jsx_runtime_.jsx)(SendButton, {
                                type: "primary",
                                disabled: !sessionActive || senderContent.length > MAX_CONTENT_LENGTH || senderLoading,
                                style: {
                                    width: '36px',
                                    height: '36px',
                                    fontSize: '18px'
                                }
                            })
                        })
                    ]
                });
            }
        })
    });
};
const ChatSender = SenderContainer;
const REPLAY_INTERVAL = 300;
const useReplay_useReplay = (replayId, needPassword, defaultPassword = '')=>{
    const { t } = useTranslation_useTranslation();
    const [loading, setLoading] = (0, external_react_.useState)(true);
    const [loaded, setLoaded] = (0, external_react_.useState)(false);
    const [isPlaying, setIsPlaying] = (0, external_react_.useState)(false);
    const [error, setError] = (0, external_react_.useState)('');
    const passwordRef = (0, external_react_.useRef)(defaultPassword);
    const inputRef = (0, external_react_.useRef)(null);
    const [originalChunks, setOriginalChunks] = (0, external_react_.useState)([]);
    const [needRetryPassword, setNeedRetryPassword] = (0, external_react_.useState)(false);
    const { chunks } = agent();
    useChunksProcessor(chunks);
    const playInterval = (0, external_react_.useRef)(null);
    const end = (0, external_react_.useCallback)(()=>{
        if (playInterval.current) clearInterval(playInterval.current);
        setIsPlaying(false);
        agent.getState().setChunks([
            ...originalChunks
        ]);
    }, [
        originalChunks
    ]);
    const start = (0, external_react_.useCallback)(()=>{
        agent.getState().setChunks([]);
        agent.getState().setFileViewerFile(void 0);
        agent.getState().setPipelineTargetMessage(void 0);
        let index = 0;
        if (playInterval.current) clearInterval(playInterval.current);
        setIsPlaying(true);
        playInterval.current = setInterval(()=>{
            if (index < originalChunks.length) {
                agent.getState().addChunk(originalChunks[index]);
                index++;
            } else {
                clearInterval(playInterval.current);
                setIsPlaying(false);
            }
        }, REPLAY_INTERVAL);
        return ()=>{
            clearInterval(playInterval.current);
            setIsPlaying(false);
        };
    }, [
        originalChunks
    ]);
    const getShareChatDetail = (0, external_react_.useCallback)(async ()=>{
        const params = {};
        if (needPassword) {
            params.encrypt = true;
            params.password = passwordRef.current;
        }
        setLoading(true);
        try {
            const response = await fetch(`${agent.getState().requestPrefix}/api/v1/sessions/share/${replayId}?${new URLSearchParams(params).toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    language: useTranslation_getLanguage()
                }
            });
            if (!response.ok) {
                setError(response.statusText);
                setLoading(false);
                return;
            }
            const chunks = [];
            setLoading(false);
            setIsPlaying(true);
            try {
                for await (const chunk of XStream({
                    readableStream: response.body
                })){
                    const chunkData = isJsonString(chunk.data) ? JSON.parse(chunk.data) : null;
                    if (chunkData) {
                        devLog('chunkData', chunkData);
                        if ('replay_session' === chunkData.type) {
                            agent.getState().setSessionInfo({
                                title: chunkData.content,
                                status: 'ARCHIVED'
                            });
                            continue;
                        }
                        if ('password_error' === chunkData.type) {
                            external_antd_message.error(useTranslation_getTranslation('error.password.incorrect'));
                            setNeedRetryPassword(true);
                            setLoading(false);
                            return;
                        }
                        agent.getState().addChunk(chunkData);
                        chunks.push(chunkData);
                    }
                    await new Promise((resolve)=>setTimeout(resolve, REPLAY_INTERVAL));
                }
                setOriginalChunks(chunks);
                setLoaded(true);
                setIsPlaying(false);
            } catch (error) {
                if ('AbortError' === error.name) return void console.error('Request was aborted by user');
                agent.getState().addChunk({
                    id: Date.now().toString(),
                    role: 'assistant',
                    type: 'error',
                    content: error.message
                });
            }
            return;
        } catch (error) {
            setLoading(false);
            setError("\u83B7\u53D6\u5206\u4EAB\u8BE6\u60C5\u5931\u8D25");
            console.error('Failed to get share detail:', error);
        }
    }, [
        needPassword,
        replayId
    ]);
    const askPassword = (0, external_react_.useCallback)(async ()=>{
        const modal = await external_antd_Modal.confirm({
            title: t('share.authentication'),
            content: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Input.Password, {
                placeholder: t('share.password'),
                autoFocus: true,
                ref: inputRef,
                defaultValue: passwordRef.current,
                onChange: (e)=>{
                    passwordRef.current = e.target.value;
                },
                onPressEnter: ()=>{
                    setNeedRetryPassword(false);
                    getShareChatDetail();
                    modal.destroy();
                },
                required: true
            }),
            onOk: ()=>{
                setNeedRetryPassword(false);
                getShareChatDetail();
                modal.destroy();
            },
            onCancel: ()=>{
                setLoading(false);
                setNeedRetryPassword(false);
            },
            afterOpenChange (open) {
                if (open) {
                    var _inputRef_current;
                    null == (_inputRef_current = inputRef.current) || _inputRef_current.focus();
                }
            }
        });
    }, [
        getShareChatDetail,
        t
    ]);
    (0, external_react_.useEffect)(()=>{
        if (needRetryPassword) askPassword();
    }, [
        needRetryPassword,
        askPassword
    ]);
    (0, external_react_.useEffect)(()=>{
        if (needPassword && !defaultPassword) askPassword();
        else getShareChatDetail();
    }, [
        askPassword,
        getShareChatDetail,
        needPassword,
        defaultPassword
    ]);
    return {
        isPlaying,
        loading,
        loaded,
        start,
        end
    };
};
const useReplay = useReplay_useReplay;
const ReplaySender_SenderContainer = ()=>{
    const { shareId, sharePassword } = agent();
    const { t } = useTranslation_useTranslation();
    const { isPlaying, start, end, loaded } = useReplay(shareId.slice(2), shareId.startsWith('e-'), sharePassword);
    const handleJumpToEnd = (0, external_react_.useCallback)(()=>{
        end();
    }, [
        end
    ]);
    const handleRestart = (0, external_react_.useCallback)(()=>{
        start();
    }, [
        start
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "flex items-center gap-6 bg-white rounded-xl py-3 px-4 w-full border border-[#d9d9d9] shadow-[0_1px_2px_0_rgba(0,_0,_0,_0.03),_0_1px_6px_-1px_rgba(0,_0,_0,_0.02),_0_2px_4px_0_rgba(0,_0,_0,_0.02)]",
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "flex-1 flex items-center gap-2",
                children: isPlaying ? t('task.replay.replaying') : loaded ? t('task.replay.finished') : ''
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)(Space, {
                children: isPlaying ? /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                    shape: "round",
                    color: "default",
                    variant: "solid",
                    icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(StepForwardOutlined, {}),
                    onClick: handleJumpToEnd,
                    disabled: !loaded,
                    children: t('sender.replay.end')
                }) : /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                    shape: "round",
                    color: "primary",
                    variant: "solid",
                    icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(CaretRightOutlined, {}),
                    onClick: handleRestart,
                    disabled: !loaded,
                    children: t('sender.replay.restart')
                })
            })
        ]
    });
};
const ReplaySender = ReplaySender_SenderContainer;
const Sender_SenderContainer = ()=>{
    const { mode } = agent();
    if (mode === types_AgentMode.Chatbot) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(ChatSender, {});
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(ReplaySender, {});
};
const Chatbot_Sender = Sender_SenderContainer;
const ACTIVE_ICON_COLOR = 'rgb(0, 129, 242)';
const transformAttachmentToFileCard = (attachment)=>({
        uid: attachment.filename || attachment.name,
        name: attachment.filename || attachment.name,
        type: attachment.content_type || attachment.type,
        fileName: attachment.filename || attachment.name,
        size: attachment.size,
        url: attachment.url
    });
const AttachmentOverlay = ({ isActive })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: classnames('absolute top-0 left-0 w-full h-full flex items-center justify-end px-3 pointer-events-none', {
            'opacity-0 group-hover:opacity-100': !isActive,
            'opacity-100': isActive
        }),
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
            className: "border border-[#EDEDED] rounded-[4px] p-1 w-[24px] h-[24px] flex items-center justify-center",
            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(EyeOutlined, {
                style: {
                    color: isActive ? ACTIVE_ICON_COLOR : 'inherit'
                }
            })
        })
    });
const AttachmentCard_AttachmentCard = ({ attachment, isActive, onSelect })=>{
    var _attachment_content_type, _attachment_type;
    const handleClick = ()=>onSelect(attachment);
    const isImage = (null == (_attachment_content_type = attachment.content_type) ? void 0 : _attachment_content_type.startsWith('image/')) || (null == (_attachment_type = attachment.type) ? void 0 : _attachment_type.startsWith('image/'));
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "cursor-pointer relative group",
        onClick: handleClick,
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)(Attachments.FileCard, {
                item: transformAttachmentToFileCard(attachment),
                imageProps: {
                    preview: false
                }
            }),
            !isImage && /*#__PURE__*/ (0, jsx_runtime_.jsx)(AttachmentOverlay, {
                isActive: isActive
            })
        ]
    });
};
const AttachmentCard = AttachmentCard_AttachmentCard;
const getVisibleAttachments = (attachments)=>null == attachments ? void 0 : attachments.filter((attachment)=>0 !== attachment.show_user);
const MessageAttachments_MessageAttachments = ({ message })=>{
    var _message_detail, _message_detail1;
    const { setFileViewerFile, fileViewerFile } = agent();
    const attachments = (null == (_message_detail = message.detail) ? void 0 : _message_detail.attachments) || (null == (_message_detail1 = message.detail) ? void 0 : _message_detail1.files);
    const visibleAttachments = getVisibleAttachments(attachments);
    if (!visibleAttachments || 0 === visibleAttachments.length) return null;
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "flex flex-wrap gap-2",
        children: visibleAttachments.map((attachment)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(AttachmentCard, {
                attachment: attachment,
                isActive: fileViewerFile === attachment,
                onSelect: setFileViewerFile
            }, attachment.filename || attachment.name))
    });
};
const MessageAttachments = MessageAttachments_MessageAttachments;
const ClickableTool_ClickableTool = ({ children, onClick, active })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        onClick: onClick,
        className: `cursor-pointer rounded-3xl border flex items-center gap-2 px-3 py-2 leading-4 border-[#e9e9e9] bg-[#f0f0f0] w-fit max-w-full relative hover:bg-[#e5e5e5] ${active ? 'active' : ''}`,
        children: children
    });
const ClickableTool = ClickableTool_ClickableTool;
import zoom_in_namespaceObject from "./static/image/zoom-in.png";
import back_namespaceObject from "./static/image/back.png";
import footer_bg_namespaceObject from "./static/image/footer-bg.png";
const copySvg = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("svg", {
        width: "1em",
        height: "1em",
        viewBox: "0 0 16 17",
        fill: "none",
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
                fillRule: "evenodd",
                clipRule: "evenodd",
                d: "M7.15819 2C6.21025 2 5.34881 2.72709 5.34881 3.74024V10.0778C5.34881 11.091 6.21025 11.8181 7.15819 11.8181H12.2666C13.2146 11.8181 14.076 11.091 14.076 10.0778V5.97398C14.076 5.42112 13.8655 4.86293 13.4396 4.44281C13.4343 4.43757 13.4289 4.43244 13.4234 4.42742L11.4298 2.61624C10.9995 2.19653 10.4376 2 9.84407 2H7.15819ZM6.4397 3.74024C6.4397 3.40275 6.73686 3.0909 7.15819 3.0909H9.84407C10.1945 3.0909 10.4717 3.20342 10.6723 3.4013C10.6776 3.40654 10.683 3.41167 10.6885 3.41669L12.6806 5.22653C12.882 5.42902 12.9851 5.69889 12.9851 5.97398V10.0778C12.9851 10.4153 12.6879 10.7272 12.2666 10.7272H7.15819C6.73686 10.7272 6.4397 10.4153 6.4397 10.0778V3.74024Z",
                fill: "currentColor"
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
                d: "M4.25755 5.16372C4.25755 4.86248 4.01335 4.61827 3.71211 4.61827C3.41086 4.61827 3.16666 4.86248 3.16666 5.16372V11.2728C3.16666 12.7996 4.47346 14 6.00299 14H10.7484C11.0496 14 11.2938 13.7558 11.2938 13.4546C11.2938 13.1533 11.0496 12.9091 10.7484 12.9091H6.00299C5.02345 12.9091 4.25755 12.1459 4.25755 11.2728V5.16372Z",
                fill: "currentColor"
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
                fillRule: "evenodd",
                clipRule: "evenodd",
                d: "M7.15819 2C6.21025 2 5.34881 2.72709 5.34881 3.74024V10.0778C5.34881 11.091 6.21025 11.8181 7.15819 11.8181H12.2666C13.2146 11.8181 14.076 11.091 14.076 10.0778V5.97398C14.076 5.42112 13.8655 4.86293 13.4396 4.44281C13.4343 4.43757 13.4289 4.43244 13.4234 4.42742L11.4298 2.61624C10.9995 2.19653 10.4376 2 9.84407 2H7.15819ZM6.4397 3.74024C6.4397 3.40275 6.73686 3.0909 7.15819 3.0909H9.84407C10.1945 3.0909 10.4717 3.20342 10.6723 3.4013C10.6776 3.40654 10.683 3.41167 10.6885 3.41669L12.6806 5.22653C12.882 5.42902 12.9851 5.69889 12.9851 5.97398V10.0778C12.9851 10.4153 12.6879 10.7272 12.2666 10.7272H7.15819C6.73686 10.7272 6.4397 10.4153 6.4397 10.0778V3.74024Z",
                stroke: "currentColor",
                strokeWidth: "0.2"
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
                d: "M4.25755 5.16372C4.25755 4.86248 4.01335 4.61827 3.71211 4.61827C3.41086 4.61827 3.16666 4.86248 3.16666 5.16372V11.2728C3.16666 12.7996 4.47346 14 6.00299 14H10.7484C11.0496 14 11.2938 13.7558 11.2938 13.4546C11.2938 13.1533 11.0496 12.9091 10.7484 12.9091H6.00299C5.02345 12.9091 4.25755 12.1459 4.25755 11.2728V5.16372Z",
                stroke: "currentColor",
                strokeWidth: "0.2"
            })
        ]
    });
const CustomIcon_svgMap = {
    copy: copySvg
};
const components_CustomIcon_CustomIcon = ({ type, className = '', onClick, onMouseDown, ...otherProps })=>{
    const iconRender = ()=>{
        const events = {
            onClick,
            onMouseDown
        };
        return /*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
            className: classnames({
                'flex justify-start items-center': true,
                [className]: true
            }),
            component: CustomIcon_svgMap[type],
            ...events,
            ...otherProps
        });
    };
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "flex justify-center items-center",
        children: iconRender()
    });
};
const Markdown_components_CustomIcon = components_CustomIcon_CustomIcon;
const Mermaid = /*#__PURE__*/ (0, external_react_.lazy)(()=>__webpack_require__.e("327").then(__webpack_require__.bind(__webpack_require__, "./src/components/Infra/Markdown/components/Mermaid.tsx")));
const PreElement = ({ processing, children, onCopied })=>{
    const [language, setLanguage] = (0, external_react_.useState)('');
    const [copyText, setCopyText] = (0, external_react_.useState)('');
    const { t } = useTranslation_useTranslation();
    const codeRef = (0, external_react_.useRef)(null);
    const { message } = App.useApp();
    const handleCopied = (0, external_react_.useCallback)((copy)=>{
        if (copy.length > 0) message.success(t('code.copy.success'));
    }, []);
    (0, external_react_.useLayoutEffect)(()=>{
        if (null == codeRef ? void 0 : codeRef.current) {
            var _codeRef_current_querySelectorAll_, _codeRef_current_querySelectorAll, _codeRef_current, _codeClassName_match, _codeRef_current1;
            const codeClassName = null == codeRef ? void 0 : null == (_codeRef_current = codeRef.current) ? void 0 : null == (_codeRef_current_querySelectorAll = _codeRef_current.querySelectorAll('code')) ? void 0 : null == (_codeRef_current_querySelectorAll_ = _codeRef_current_querySelectorAll[0]) ? void 0 : _codeRef_current_querySelectorAll_.className;
            const languageValue = (null == codeClassName ? void 0 : null == (_codeClassName_match = codeClassName.match(/language-(\w+)/)) ? void 0 : _codeClassName_match[1]) || '';
            const copyTextValue = null == codeRef ? void 0 : null == (_codeRef_current1 = codeRef.current) ? void 0 : _codeRef_current1.innerText;
            if (language !== languageValue) setLanguage(languageValue);
            if (copyText !== copyTextValue) setCopyText(copyTextValue);
        }
    }, [
        copyText,
        language
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)(jsx_runtime_.Fragment, {
        children: [
            'mermaid' === language && /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_react_.Suspense, {
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Mermaid, {
                    processing: processing,
                    text: copyText
                })
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("pre", {
                className: classnames({
                    'code-wrapper': true,
                    'code-wrapper-show': 'mermaid' !== language
                }),
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                        className: "code-header",
                        children: [
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
                                children: language
                            }),
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)(CopyToClipboard, {
                                text: copyText,
                                onCopy: handleCopied,
                                children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)("span", {
                                    className: "copy-btn",
                                    children: [
                                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown_components_CustomIcon, {
                                            className: "copy-icon",
                                            type: "copy"
                                        }),
                                        /*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
                                            children: t('code.copy')
                                        })
                                    ]
                                })
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        ref: codeRef,
                        children: children
                    })
                ]
            })
        ]
    });
};
const components_PreElement = PreElement;
const ImgElement = ({ src, alt })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
        className: "img-wrapper",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
            src: src,
            alt: alt
        })
    });
const components_ImgElement = ImgElement;
const OlElement_OlElement = ({ children, start = 1 })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("ol", {
        start: start,
        style: {
            counterReset: `li ${start - 1}`
        },
        children: children
    });
const OlElement = OlElement_OlElement;
const LiElement = ({ children, className, ...props })=>{
    const liRef = (0, external_react_.useRef)(null);
    (0, external_react_.useEffect)(()=>{
        const observer = new ResizeObserver((entries)=>{
            var _entries_, _liElement_querySelectorAll;
            const liElement = null == entries ? void 0 : null == (_entries_ = entries[0]) ? void 0 : _entries_.target;
            const math = null == liElement ? void 0 : null == (_liElement_querySelectorAll = liElement.querySelectorAll('.math')) ? void 0 : _liElement_querySelectorAll[0];
            if (math) {
                var _liElement_style;
                const top = (null == math ? void 0 : math.offsetTop) === 0 ? (null == math ? void 0 : math.clientHeight) / 2 - 10 : 0;
                null == liElement || null == (_liElement_style = liElement.style) || _liElement_style.setProperty('--before-top', `${top}px`);
            }
        });
        if (null == liRef ? void 0 : liRef.current) observer.observe(null == liRef ? void 0 : liRef.current);
        return ()=>observer.disconnect();
    }, []);
    const isTaskListItem = null == className ? void 0 : className.includes('task-list-item');
    const { ordered, ...domProps } = props;
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("li", {
        ref: liRef,
        className: className,
        ...domProps,
        style: isTaskListItem ? {
            listStyle: 'none'
        } : void 0,
        children: children
    });
};
const components_LiElement = LiElement;
var _window_navigator, _window;
const parser = new UAParser(null == (_window = window) ? void 0 : null == (_window_navigator = _window.navigator) ? void 0 : _window_navigator.userAgent);
const getDevice = ()=>{
    var _parser_getDevice;
    return (null == (_parser_getDevice = parser.getDevice()) ? void 0 : _parser_getDevice.type) || 'desktop';
};
const SectionElement = ({ className = '', type, title, children })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("section", {
        className: className,
        children: type ? /*#__PURE__*/ (0, jsx_runtime_.jsxs)(jsx_runtime_.Fragment, {
            children: [
                /*#__PURE__*/ (0, jsx_runtime_.jsxs)("h6", {
                    children: [
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown_components_CustomIcon, {
                            className: "section-icon",
                            type: type
                        }),
                        title
                    ]
                }),
                /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                    className: classnames({
                        [`${type}-content`]: true,
                        [`${type}-${getDevice()}-content`]: true
                    }),
                    children: children
                })
            ]
        }) : children
    });
const components_SectionElement = SectionElement;
const TableElement = ({ children })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        style: {
            overflowX: 'auto'
        },
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("table", {
            children: children
        })
    });
const components_TableElement = TableElement;
const LinkElement = ({ href, children })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("a", {
        href: href,
        target: "_blank",
        children: children
    });
const components_LinkElement = LinkElement;
const SupElement_SupElement = ({ quoteInfoList, children })=>{
    const { t } = useTranslation_useTranslation();
    const { message } = App.useApp();
    const childrenValue = Array.isArray(children) ? children[0] : null;
    const childrenStringValue = 'string' == typeof childrenValue ? childrenValue : '';
    const isNumeric = /^\d+$/.test(childrenStringValue);
    const handleSupClick = ()=>{
        if ((0, external_lodash_es_.isEmpty)(quoteInfoList)) return;
        if (isNumeric) {
            var _quoteInfoList_;
            const url = null == quoteInfoList ? void 0 : null == (_quoteInfoList_ = quoteInfoList[childrenValue - 1]) ? void 0 : _quoteInfoList_.url;
            if (url) window.open(url);
        } else message.error(t('url.404'));
    };
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
        className: classnames({
            sup: true,
            'is-number': isNumeric
        }),
        onClick: handleSupClick,
        children: children
    });
};
const SupElement = SupElement_SupElement;
const Markdown_Markdown = ({ content = '', className = '', processing, onCopied })=>{
    var _defaultSchema_attributes, _defaultSchema_attributes1;
    const transformContent = (content)=>{
        const pattern = /(\n|^)([-*]|[\d]\.)[^\n]*\n/g;
        const replacement = "$1$&";
        return content.replace(pattern, replacement);
    };
    const escapeDollarNumber = (text)=>null == text ? void 0 : text.replace(/(\$\d+[^a-zA-Z])/g, '\\$1');
    const escapeBrackets = (text)=>{
        const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
        let result = text.replace(pattern, (match, codeBlock, squareBracket, roundBracket)=>{
            if (codeBlock) return codeBlock;
            if (squareBracket) return `$$${squareBracket}$$`;
            if (roundBracket) return `$${roundBracket}$`;
            return match;
        });
        result = result.replace(/(https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+)/g, '$1 ');
        return result;
    };
    const escapedContent = (0, external_react_.useMemo)(()=>transformContent(escapeBrackets(escapeDollarNumber(content))), [
        content
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: classnames({
            'message-content-text': true,
            [className]: !!className
        }),
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(react_markdown, {
            remarkPlugins: [
                [
                    remark_gfm,
                    {
                        singleTilde: false
                    }
                ],
                remark_breaks,
                remark_emoji,
                remark_images,
                remark_math,
                remark_directive,
                remark_directive_rehype
            ],
            rehypePlugins: [
                rehype_raw,
                [
                    rehype_sanitize,
                    {
                        ...defaultSchema,
                        attributes: {
                            ...defaultSchema.attributes,
                            '*': [
                                [
                                    'className',
                                    /^language-./,
                                    'math-inline',
                                    'math-display',
                                    'katex'
                                ]
                            ],
                            input: [
                                ...(null == (_defaultSchema_attributes = defaultSchema.attributes) ? void 0 : _defaultSchema_attributes.input) || [],
                                'type',
                                'checked',
                                'disabled'
                            ],
                            ol: [
                                ...(null == (_defaultSchema_attributes1 = defaultSchema.attributes) ? void 0 : _defaultSchema_attributes1.ol) || [],
                                'start'
                            ]
                        }
                    }
                ],
                rehype_katex,
                [
                    rehype_highlight,
                    {
                        ignoreMissing: true
                    }
                ]
            ],
            remarkRehypeOptions: {
                footnoteLabel: 'Sources',
                footnoteLabelTagName: 'div',
                footnoteLabelProperties: {
                    className: 'footnote-label'
                }
            },
            components: {
                pre: (code)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(components_PreElement, {
                        ...code,
                        processing: processing,
                        onCopied: onCopied
                    }),
                img: (code)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(components_ImgElement, {
                        ...code
                    }),
                ol: (code)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(OlElement, {
                        ...code
                    }),
                li: (code)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(components_LiElement, {
                        ...code
                    }),
                section: (code)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(components_SectionElement, {
                        ...code
                    }),
                table: (code)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(components_TableElement, {
                        ...code
                    }),
                a: (code)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(components_LinkElement, {
                        ...code
                    }),
                sup: (code)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(SupElement, {
                        ...code
                    })
            },
            children: escapedContent
        })
    });
};
const Markdown = /*#__PURE__*/ (0, external_react_.memo)(Markdown_Markdown);
import phone_bg_top_namespaceObject from "./static/svg/phone-bg-top.svg";
import phone_bg_bottom_namespaceObject from "./static/svg/phone-bg-bottom.svg";
import phone_highlight_namespaceObject from "./static/image/phone-highlight.png";
const loadNzCpSDK = ()=>new Promise((resolve, reject)=>{
        if ('undefined' != typeof window && window.NzCp) return void resolve();
        const existingScript = document.querySelector('script[src*="NZsdk.min.2.8.1.js"]');
        if (existingScript) {
            existingScript.addEventListener('load', ()=>resolve());
            existingScript.addEventListener('error', reject);
            return;
        }
        const script = document.createElement("script");
        script.src = '/NZsdk.min.2.8.1.js';
        script.async = true;
        script.onload = ()=>{
            if ('undefined' != typeof window && window.NzCp) resolve();
            else reject(new Error("NzCp SDK \u52A0\u8F7D\u5931\u8D25"));
        };
        script.onerror = ()=>{
            reject(new Error("NzCp SDK \u811A\u672C\u52A0\u8F7D\u5931\u8D25"));
        };
        document.head.appendChild(script);
    });
const CloudPhone_CloudPhone = ({ disabled, needHumanIntervention = false, phoneRender, onUnbindPhone, accessKey, accessSecretKey, instanceNo, userId })=>{
    const sdkIns = (0, external_react_.useRef)(null);
    const [phoneErrorCode, setPhoneErrorCode] = (0, external_react_.useState)(0);
    const [needHighlight, setNeedHighlight] = (0, external_react_.useState)(needHumanIntervention);
    const handlePhoneStart = (0, external_react_.useCallback)(async ()=>{
        try {
            try {
                await loadNzCpSDK();
            } catch (error) {
                console.error('NzCp SDK fail to load:', error);
                external_antd_message.error('SDK fail to load');
                return;
            }
            if ('undefined' == typeof window || !window.NzCp) {
                console.error('NzCp not found');
                external_antd_message.error('SDK not found');
                return;
            }
            sdkIns.current = new window.NzCp();
            const param = {
                userId,
                instanceNo,
                mountId: 'playBox',
                isShowPausedDialog: false
            };
            const callbacks = {
                onInitFail: (code)=>{
                    console.info("\u4E91\u624B\u673A\u521D\u59CB\u5316\u5931\u8D25:" + code);
                },
                onStartFail: (code)=>{
                    console.info("\u4E91\u624B\u673A\u94FE\u63A5\u5931\u8D25:" + code);
                },
                onError: (code)=>{
                    setPhoneErrorCode(code);
                    console.info("\u4E91\u624B\u673A\u62A5\u9519\u4E86:" + code);
                }
            };
            const initRet = sdkIns.current.init(param, callbacks);
            if (!initRet) return void console.info("\u4E91\u624B\u673A\u521D\u59CB\u5316\u5931\u8D25");
            sdkIns.current.start(accessKey, accessSecretKey);
        } catch (error) {
            console.info(error);
        }
    }, [
        accessKey,
        accessSecretKey,
        instanceNo,
        userId
    ]);
    const handlePhoneStop = ()=>{
        if (sdkIns.current) {
            var _sdkIns_current_destroy, _sdkIns_current;
            null == (_sdkIns_current = sdkIns.current) || null == (_sdkIns_current_destroy = _sdkIns_current.destroy) || _sdkIns_current_destroy.call(_sdkIns_current);
            sdkIns.current = null;
        }
    };
    const handlePhoneBack = ()=>{
        if (sdkIns.current) {
            var _sdkIns_current;
            null == (_sdkIns_current = sdkIns.current) || _sdkIns_current.back();
        }
    };
    const handlePhoneHome = ()=>{
        if (sdkIns.current) {
            var _sdkIns_current;
            null == (_sdkIns_current = sdkIns.current) || _sdkIns_current.home();
        }
    };
    const handlePhoneMenu = ()=>{
        if (sdkIns.current) {
            var _sdkIns_current;
            null == (_sdkIns_current = sdkIns.current) || _sdkIns_current.menu();
        }
    };
    (0, external_react_.useEffect)(()=>{
        if (!phoneRender) handlePhoneStart();
        return ()=>{
            handlePhoneStop();
        };
    }, [
        handlePhoneStart,
        phoneRender
    ]);
    (0, external_react_.useEffect)(()=>{
        if (needHumanIntervention) setNeedHighlight(true);
    }, [
        needHumanIntervention
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: `relative w-[316px] max-2xl:w-[239px] pt-[14px] max-2xl:pt-[12px] px-[12px] max-2xl:px-[10px] overflow-hidden transition-all duration-300 ease-out rounded-[50px] max-2xl:rounded-[38px] shadow-[0px_4px_6px_rgba(0,_0,_0,_0.12),_0px_4px_12px_rgba(0,_0,_0,_0.12)] ${needHumanIntervention ? 'pb-[62px] max-2xl:pb-[52px]' : 'pb-[14px] max-2xl:pb-[12px]'}`,
        children: [
            disabled && /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "absolute top-0 left-0 z-10 w-full h-full"
            }),
            needHighlight && /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "absolute top-0 left-0 z-2 w-full h-[548px] max-2xl:h-[414px] bg-top bg-no-repeat bg-[length:100%_100%] animate-fade-in-out",
                style: {
                    backgroundImage: `url(${phone_highlight_namespaceObject})`
                },
                onMouseEnter: ()=>setNeedHighlight(false)
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "absolute top-0 left-0 z-0 w-full h-full bg-top bg-no-repeat bg-[length:100%_auto]",
                style: {
                    backgroundImage: `url(${phone_bg_top_namespaceObject})`
                }
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "absolute bottom-0 left-0 z-0 flex items-end w-full h-full pb-[20px] max-2xl:pb-[18px] bg-bottom bg-no-repeat bg-[length:100%_auto]",
                style: {
                    backgroundImage: `url(${phone_bg_bottom_namespaceObject})`
                },
                children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                    className: "flex justify-around w-full",
                    children: [
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                            className: `text-[28px] active:text-white max-2xl:text-[20px] ${disabled ? 'text-white/[0.3] cursor-default' : 'text-white/[0.8] cursor-pointer'}`,
                            onClick: handlePhoneBack,
                            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_CustomIcon, {
                                type: "phoneBack"
                            })
                        }),
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                            className: `text-[28px] active:text-white max-2xl:text-[20px] ${disabled ? 'text-white/[0.3] cursor-default' : 'text-white/[0.8] cursor-pointer'}`,
                            onClick: handlePhoneHome,
                            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_CustomIcon, {
                                type: "phoneHome"
                            })
                        }),
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                            className: `text-[28px] active:text-white max-2xl:text-[20px] ${disabled ? 'text-white/[0.3] cursor-default' : 'text-white/[0.8] cursor-pointer'}`,
                            onClick: handlePhoneMenu,
                            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_CustomIcon, {
                                type: "phoneMenu"
                            })
                        })
                    ]
                })
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "relative flex justify-center items-center w-[292px] max-2xl:w-[219px] h-[520px] max-2xl:h-[390px] overflow-hidden rounded-[36px] max-2xl:rounded-[28px] bg-[#fff]",
                children: (0, external_lodash_es_.isFunction)(phoneRender) ? phoneRender() : /*#__PURE__*/ (0, jsx_runtime_.jsxs)(jsx_runtime_.Fragment, {
                    children: [
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(Spin, {}),
                        0 !== phoneErrorCode && /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                            className: "absolute top-1/2 pt-[24px] text-[#999999]",
                            children: [
                                "Error Code ",
                                phoneErrorCode
                            ]
                        }),
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                            id: "playBox",
                            className: "absolute left-[-214px] max-2xl:left-[-251px] top-0 w-[720px] h-[520px] max-2xl:h-[390px] overflow-hidden "
                        })
                    ]
                })
            })
        ]
    });
};
const CloudPhone = CloudPhone_CloudPhone;
const Code_Code = ({ originalCode = '', code = '', language = 'plaintext', isDiff = true })=>{
    const [mode, setMode] = (0, external_react_.useState)('new');
    const { t } = useTranslation_useTranslation();
    const editorProps = {
        width: '100%',
        height: '100%',
        language,
        theme: 'vs-dark',
        options: {
            readOnly: true,
            lineNumbers: 'off',
            minimap: {
                enabled: false
            },
            unicodeHighlight: {
                ambiguousCharacters: false
            }
        }
    };
    const renderCode = ()=>{
        if ('diff' === mode) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(DiffEditor, {
            original: originalCode,
            modified: code,
            ...editorProps
        });
        if ('old' === mode) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(react, {
            value: originalCode,
            ...editorProps
        });
        if ('new' === mode) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(react, {
            value: code,
            ...editorProps
        });
    };
    if (isDiff) return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "w-full h-full relative",
        children: [
            renderCode(),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Radio.Group, {
                value: mode,
                onChange: (e)=>setMode(e.target.value),
                className: "absolute top-2 right-2 z-[1000]",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Radio.Button, {
                        value: "diff",
                        children: t('code.diff')
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Radio.Button, {
                        value: "old",
                        children: t('code.old')
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Radio.Button, {
                        value: "new",
                        children: t('code.new')
                    })
                ]
            })
        ]
    });
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(react, {
        ...editorProps,
        value: code
    });
};
const Code = Code_Code;
const Terminal = ({ content })=>{
    const lines = content.split('\n').slice(0, 1000);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "terminal-output w-full h-full whitespace-pre-wrap p-4 overflow-y-auto",
        children: lines.map((line, idx)=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)(external_react_.Fragment, {
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(ansi_to_react, {
                        children: line
                    }),
                    idx !== lines.length - 1 && /*#__PURE__*/ (0, jsx_runtime_.jsx)("br", {})
                ]
            }, idx))
    });
};
const Infra_Terminal = Terminal;
const Search = ({ data, ...props })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(List, {
        className: "w-full h-full overflow-y-auto chat-scrollbar",
        ...props,
        dataSource: data || props.dataSource,
        renderItem: (item)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(List.Item, {
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(List.Item.Meta, {
                    className: "px-3",
                    title: /*#__PURE__*/ (0, jsx_runtime_.jsxs)("a", {
                        href: item.link,
                        title: item.title,
                        target: "_blank",
                        rel: "noreferrer",
                        className: "search-title font-medium",
                        children: [
                            !item.icon && /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
                                src: `https://www.google.com/s2/favicons?domain=${item.link}&sz=32`
                            }),
                            'string' == typeof item.icon && item.icon && /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
                                src: item.icon,
                                alt: ""
                            }),
                            'string' != typeof item.icon && item.icon,
                            item.title
                        ]
                    }),
                    description: /*#__PURE__*/ (0, jsx_runtime_.jsx)("p", {
                        className: "search-description",
                        children: item.description
                    })
                })
            })
    });
const Infra_Search = Search;
const FILE_SIGNATURES = {
    docx: [
        0x50,
        0x4b,
        0x03,
        0x04
    ],
    xlsx: [
        0x50,
        0x4b,
        0x03,
        0x04
    ],
    pptx: [
        0x50,
        0x4b,
        0x03,
        0x04
    ],
    pdf: [
        0x25,
        0x50,
        0x44,
        0x46
    ],
    zip: [
        0x50,
        0x4b,
        0x03,
        0x04
    ],
    rar: [
        0x52,
        0x61,
        0x72,
        0x21,
        0x1a,
        0x07
    ],
    gz: [
        0x1f,
        0x8b
    ]
};
const detectFileType = (buffer)=>{
    const uint8Array = new Uint8Array(buffer);
    if (matchesSignature(uint8Array, FILE_SIGNATURES.zip)) {
        const zipContent = new TextDecoder().decode(uint8Array);
        if (zipContent.includes('ppt/presentation.xml')) return 'pptx';
        if (zipContent.includes('word/document.xml')) return 'docx';
        if (zipContent.includes('xl/workbook.xml')) return 'xlsx';
        return 'zip';
    }
    if (matchesSignature(uint8Array, FILE_SIGNATURES.pdf)) return 'pdf';
    return 'unknown';
};
const matchesSignature = (uint8Array, signature)=>{
    if (0 === signature.length) return false;
    if (uint8Array.length < signature.length) return false;
    for(let i = 0; i < signature.length; i++)if (uint8Array[i] !== signature[i]) return false;
    return true;
};
const cache = new Map();
const cacheFileType = new Map();
const cacheBlobUrl = new Map();
const hasGarbledText = (text)=>{
    const garbledPatterns = [
        /[\uFFFD]/g,
        /[\u007F-\u009F]/g,
        /[\uFFFE\uFFFF]/g
    ];
    return garbledPatterns.some((pattern)=>pattern.test(text));
};
const hasValidChineseText = (text)=>{
    const chinesePattern = /[\u4e00-\u9fa5]/;
    return chinesePattern.test(text);
};
const tryDecodeWithDifferentEncodings = async (arrayBuffer)=>{
    const encodings = [
        'utf-8',
        'gbk',
        'gb2312',
        'big5',
        'shift-jis'
    ];
    let bestResult = '';
    let bestScore = 0;
    for (const encoding of encodings)try {
        const decoder = new TextDecoder(encoding);
        const text = decoder.decode(arrayBuffer);
        if (text.length > 0 && !hasGarbledText(text)) {
            let score = 0;
            if (hasValidChineseText(text)) {
                const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
                if (chineseChars) score += 10 * chineseChars.length;
            }
            if (text.includes(',') || text.includes('\n')) score += 5;
            const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
            score += alphanumericCount;
            if (score > bestScore) {
                bestScore = score;
                bestResult = text;
            }
        }
    } catch (error) {
        console.warn(`Failed to decode with ${encoding}:`, error);
        continue;
    }
    if (bestResult) return bestResult;
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(arrayBuffer);
};
const useUrlContent = ({ url, contentType })=>{
    const [state, setState] = (0, external_react_.useState)({
        data: null,
        fileType: '',
        blobUrl: '',
        loading: false,
        error: null
    });
    const fetchContent = (0, external_react_.useCallback)(async (targetUrl)=>{
        if (cache.has(targetUrl)) return void setState({
            data: cache.get(targetUrl),
            fileType: cacheFileType.get(targetUrl) || '',
            blobUrl: cacheBlobUrl.get(targetUrl) || '',
            loading: false,
            error: null
        });
        setState({
            data: null,
            fileType: '',
            blobUrl: '',
            loading: true,
            error: null
        });
        const response = await fetch(targetUrl);
        if (response.ok) {
            const contentTypeHeader = contentType || response.headers.get('content-type') || '';
            const arrayBuffer = await response.arrayBuffer();
            const detectedType = detectFileType(arrayBuffer);
            console.log('Detected file type:', detectedType);
            let text;
            if (contentTypeHeader.includes('text/csv') || (null == targetUrl ? void 0 : targetUrl.endsWith('.csv'))) text = await tryDecodeWithDifferentEncodings(arrayBuffer);
            else {
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(arrayBuffer);
            }
            let blobUrl = '';
            if ('pdf' === detectedType) {
                const blob = new Blob([
                    arrayBuffer
                ], {
                    type: contentType || ''
                });
                blobUrl = URL.createObjectURL(blob);
                cacheBlobUrl.set(targetUrl, blobUrl);
            }
            cache.set(targetUrl, text);
            cacheFileType.set(targetUrl, detectedType);
            setState({
                data: text,
                fileType: detectedType,
                blobUrl,
                loading: false,
                error: null
            });
        } else setState({
            data: null,
            fileType: '',
            blobUrl: '',
            loading: false,
            error: `HTTP\u{9519}\u{8BEF}: ${response.status} ${response.statusText}`
        });
    }, [
        contentType
    ]);
    (0, external_react_.useEffect)(()=>{
        if (url) fetchContent(url);
    }, [
        url,
        fetchContent
    ]);
    return {
        ...state
    };
};
const CSVViewer = ({ content })=>{
    const ref = (0, external_react_.useRef)(null);
    const size = useSize(ref);
    const { data, columns } = (0, external_react_.useMemo)(()=>{
        if (!content) return {
            data: [],
            columns: []
        };
        try {
            let processedContent = content;
            if (0xfeff === content.charCodeAt(0)) processedContent = content.slice(1);
            else if (0xfffe === content.charCodeAt(0)) processedContent = content.slice(1);
            const lines = processedContent.trim().split('\n');
            if (0 === lines.length) return {
                data: [],
                columns: []
            };
            const headers = lines[0].split(',').map((header)=>header.trim().replace(/^["']|["']$/g, ''));
            const data = [];
            for(let i = 1; i < lines.length; i++){
                const line = lines[i];
                if (!line.trim()) continue;
                const values = [];
                let current = '';
                let inQuotes = false;
                for(let j = 0; j < line.length; j++){
                    const char = line[j];
                    if ('"' === char) inQuotes = !inQuotes;
                    else if (',' !== char || inQuotes) current += char;
                    else {
                        values.push(current.trim());
                        current = '';
                    }
                }
                values.push(current.trim());
                const row = {};
                headers.forEach((header, index)=>{
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
            const tableColumns = headers.map((header)=>({
                    title: header,
                    dataIndex: header,
                    key: header,
                    ellipsis: true,
                    render: (text)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                            className: "min-w-[120px] max-w-[300px] truncate",
                            title: text,
                            children: text
                        })
                }));
            return {
                data,
                columns: tableColumns
            };
        } catch (error) {
            console.error('CSV parsing error:', error);
            return {
                data: [],
                columns: []
            };
        }
    }, [
        content
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full overflow-auto",
        ref: ref,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Table, {
            rowKey: (record)=>Object.values(record).join('-'),
            columns: columns,
            dataSource: data,
            pagination: {
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true
            },
            scroll: {
                x: 'max-content',
                y: (null == size ? void 0 : size.height) ? size.height - 100 : '100%'
            },
            className: "h-full",
            size: "small",
            bordered: true
        })
    });
};
const Infra_CSVViewer = CSVViewer;
const fileContentSupportFileTypes = [
    'html',
    'md',
    'csv'
];
const fileContentSupportContentTypes = [
    'text/html',
    'text/markdown',
    'text/csv'
];
const fileTypeToLanguage = {
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    sh: 'shell',
    bash: 'shell',
    txt: 'plaintext',
    log: 'plaintext',
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    yml: 'yaml',
    h: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    csv: 'csv',
    sql: 'sql'
};
const FileContentRender_FileContentRender = ({ fileExtension = '', contentType = '', fileContent = '', oldFileContent = '', isDiff })=>{
    const [previewType, setPreviewType] = (0, external_react_.useState)('preview');
    const { t } = useTranslation_useTranslation();
    const getTypeFromContentType = (ct)=>{
        if (ct.includes('text/markdown') || ct.includes('markdown')) return 'md';
        if (ct.includes('text/html') || ct.includes('html')) return 'html';
        if (ct.includes('text/csv') || ct.includes('csv')) return 'csv';
        if (ct.includes('text/plain') || ct.includes('plain')) return 'txt';
        return null;
    };
    const detectedType = getTypeFromContentType(contentType) || fileExtension;
    const language = fileTypeToLanguage[detectedType] || detectedType || 'plaintext';
    const renderPreview = ()=>{
        if ('html' === detectedType) return /*#__PURE__*/ (0, jsx_runtime_.jsx)("iframe", {
            srcDoc: fileContent,
            className: "w-full h-full"
        });
        if ('md' === detectedType) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
            content: fileContent,
            className: "w-full h-full"
        });
        if ('csv' === detectedType) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_CSVViewer, {
            content: fileContent
        });
    };
    const supportsPreview = fileContentSupportFileTypes.includes(detectedType) || fileContentSupportContentTypes.includes(contentType);
    if (!supportsPreview) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Code, {
        language: language,
        code: fileContent,
        originalCode: oldFileContent,
        isDiff: isDiff
    });
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "w-full h-full flex flex-col",
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "p-2",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Radio.Group, {
                    value: previewType,
                    onChange: (e)=>setPreviewType(e.target.value),
                    children: [
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(Radio.Button, {
                            value: "preview",
                            children: t('code.preview')
                        }),
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(Radio.Button, {
                            value: "raw",
                            children: t('code.raw')
                        })
                    ]
                })
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "flex-1 p-3 overflow-auto",
                children: 'preview' === previewType ? renderPreview() : /*#__PURE__*/ (0, jsx_runtime_.jsx)(Code, {
                    language: language,
                    code: fileContent,
                    originalCode: oldFileContent,
                    isDiff: isDiff
                })
            })
        ]
    });
};
const FileContentRender = FileContentRender_FileContentRender;
const ImageDetailRenderer = ({ imageUrl })=>{
    if (!imageUrl) return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full flex justify-center items-center bg-black",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
            className: "text-white",
            children: "\u56FE\u7247\u5730\u5740\u4E0D\u5B58\u5728"
        })
    });
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full flex justify-center items-center bg-black",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Image, {
            src: imageUrl,
            className: "max-w-full max-h-full w-full h-full object-contain",
            wrapperClassName: "max-w-full max-h-full w-full h-full"
        })
    });
};
const common_ImageDetailRenderer = ImageDetailRenderer;
const getFileExtension = (urlOrPath)=>{
    var _urlOrPath_split_pop;
    if (!urlOrPath) return '';
    const parts = null == (_urlOrPath_split_pop = urlOrPath.split('/').pop()) ? void 0 : _urlOrPath_split_pop.split('.');
    if (parts.length <= 1) return '';
    return parts[parts.length - 1].toLowerCase();
};
const OfficeFilePreview = ({ url, fileType })=>{
    const ref = (0, external_react_.useRef)(null);
    const initializePreview = ()=>{
        const dom = ref.current;
        if (dom) {
            if ('docx' === fileType) {
                const myDocxPreviewer = docx.init(dom);
                myDocxPreviewer.preview(url);
            }
            if ('xlsx' === fileType) {
                const myExcelPreviewer = excel.init(dom);
                myExcelPreviewer.preview(url);
            }
            if ('pptx' === fileType) {
                const pptxPrviewer = init(dom, {
                    width: dom.clientWidth,
                    height: dom.clientHeight
                });
                fetch(url).then((response)=>response.arrayBuffer()).then((res)=>{
                    pptxPrviewer.preview(res);
                });
            }
        }
    };
    (0, external_react_.useEffect)(()=>{
        initializePreview();
    }, []);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        ref: ref,
        className: "w-full h-full"
    });
};
const FileReader_OfficeFilePreview = /*#__PURE__*/ (0, external_react_.memo)(OfficeFilePreview);
const FileReader_prefix = 'https://view.officeapps.live.com/op/embed.aspx?src=';
const officeFileExtensions = [
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx'
];
const plaintextFileExtensions = [
    'txt',
    'log',
    'md',
    'csv',
    'json',
    'xml',
    'yaml',
    'yml',
    'ini',
    'conf',
    'cfg',
    'properties',
    'toml',
    'ini',
    'conf',
    'cfg',
    'properties',
    'toml',
    'ini',
    'conf',
    'cfg',
    'properties',
    'toml'
];
const codeFileExtensions = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'py',
    'sh',
    'bash',
    'html',
    'css',
    'less',
    'scss',
    'json',
    'xml',
    'yaml',
    'yml',
    'ini',
    'conf',
    'cfg',
    'properties',
    'toml',
    'ini',
    'conf',
    'cfg',
    'properties',
    'toml'
];
const FileReader = ({ url, contentType, filename })=>{
    const { data, loading, fileType, blobUrl, error } = useUrlContent({
        url,
        contentType
    });
    const ext = getFileExtension(url) || getFileExtension(filename);
    devLog(url, filename, contentType, ext);
    const isImage = [
        'png',
        'jpg',
        'jpeg',
        'gif',
        'webp'
    ].includes(ext) || [
        'image/png',
        'image/jpg',
        'image/jpeg',
        'image/gif',
        'image/webp'
    ].includes(contentType);
    (0, external_react_.useEffect)(()=>()=>{
            if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
        }, []);
    const renderUrl = ()=>{
        if (officeFileExtensions.some((ext)=>url.endsWith(ext))) return FileReader_prefix + encodeURIComponent(url);
        if ('pdf' === fileType) return blobUrl;
        return url;
    };
    if (isImage) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_ImageDetailRenderer, {
        imageUrl: url
    });
    devLog(fileContentSupportFileTypes, ext, contentType);
    if (fileContentSupportFileTypes.includes(ext) || plaintextFileExtensions.includes(ext) || codeFileExtensions.includes(ext)) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(FileContentRender, {
        fileContent: data || error || '',
        fileExtension: ext,
        isDiff: false
    }, url);
    if ([
        'docx',
        'xlsx',
        'pptx'
    ].includes(fileType)) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(FileReader_OfficeFilePreview, {
        url: url,
        fileType: fileType
    });
    if (loading) return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "flex justify-center items-center h-full",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Spin, {})
    });
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("iframe", {
        id: "file-iframe",
        src: renderUrl(),
        style: {
            width: '100%',
            height: '100%'
        }
    });
};
const Infra_FileReader = /*#__PURE__*/ (0, external_react_.memo)(FileReader);
const ToolContainer = ({ icon, action, param })=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "flex items-center gap-2 w-full overflow-hidden",
        children: [
            icon && /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "text-[16px]",
                children: icon
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "flex-1 overflow-hidden text-ellipsis whitespace-nowrap flex gap-2",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: "color-black max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap",
                        children: action
                    }),
                    param && /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: "text-[#666] flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap",
                        title: param,
                        children: param
                    })
                ]
            })
        ]
    });
const Infra_ToolContainer = ToolContainer;
const ToolBriefRenderer_ToolBriefRenderer = ({ message, withIcon })=>{
    var _message_detail, _message_detail1, _message_detail2;
    const Icon = registry.getToolIcon(message.type);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_ToolContainer, {
        icon: withIcon ? /*#__PURE__*/ (0, jsx_runtime_.jsx)(Icon, {}) : void 0,
        action: (null == (_message_detail = message.detail) ? void 0 : _message_detail.action) || (null == (_message_detail1 = message.detail) ? void 0 : _message_detail1.tool),
        param: null == (_message_detail2 = message.detail) ? void 0 : _message_detail2.action_content
    });
};
const ToolBriefRenderer = ToolBriefRenderer_ToolBriefRenderer;
const DefaultBriefRenderer = ({ message, withIcon = true })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolBriefRenderer, {
        message: message,
        withIcon: withIcon
    });
const default_DefaultBriefRenderer = DefaultBriefRenderer;
const useToolContent = (message)=>{
    var _message_detail_result, _message_detail;
    const content = (null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_result = _message_detail.result) ? void 0 : _message_detail_result.content) || '';
    if (isJsonString(content)) {
        const json = JSON.parse(content);
        if (json.content && json.content_type) return {
            content: json.content,
            contentType: json.content_type
        };
    }
    return {
        content,
        contentType: ''
    };
};
const common_useToolContent = useToolContent;
const DefaultDetailRenderer = ({ message })=>{
    const { content, contentType } = common_useToolContent(message);
    if ('text/markdown' === contentType || 'markdown' === contentType) return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full overflow-y-auto p-2",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
            content: content
        })
    });
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Code, {
        code: content,
        isDiff: false
    });
};
const default_DefaultDetailRenderer = DefaultDetailRenderer;
const SvgPhone = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 10,
        height: 16,
        fill: "none",
        viewBox: "0 0 10 16",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "currentColor",
            d: "M2.464 15.297q-.834 0-1.347-.492-.513-.486-.513-1.285V2.603q0-.8.513-1.286Q1.63.825 2.464.825h5.065q.84 0 1.347.492.513.486.513 1.286V13.52q0 .8-.513 1.285-.505.492-1.347.492zm.143-1.1h4.786q.43 0 .663-.226.232-.219.232-.63V2.782q0-.411-.232-.63-.232-.225-.663-.225H2.607q-.437 0-.67.225-.231.219-.232.63v10.56q0 .411.232.63.233.225.67.225m.944-.5a.33.33 0 0 1-.233-.089.31.31 0 0 1-.089-.232q0-.144.09-.232a.35.35 0 0 1 .232-.082h2.905a.32.32 0 0 1 .226.082q.089.088.089.232t-.09.232a.3.3 0 0 1-.225.09zm.622-10.322a.49.49 0 0 1-.349-.137.49.49 0 0 1-.136-.348q0-.199.136-.335a.48.48 0 0 1 .349-.144h1.654q.198 0 .335.144a.45.45 0 0 1 .144.335.48.48 0 0 1-.144.348.46.46 0 0 1-.335.137z"
        })
    });
const phonereact = SvgPhone;
const SvgEmpty = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 23,
        height: 27,
        fill: "none",
        viewBox: "0 0 23 27",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#000",
            d: "M10.32 26.75q-2.145 0-3.984-.785a9.9 9.9 0 0 1-3.2-2.18 10 10 0 0 1-2.132-3.234q-.762-1.852-.762-3.973a10 10 0 0 1 .762-3.855 10.5 10.5 0 0 1 2.144-3.258 9.3 9.3 0 0 1 3.165-2.18q.41-.164.703-.105.293.058.468.258.34.397-.011 1.101-.27.55-.457 1.535a11.5 11.5 0 0 0-.176 2.04q0 2.565.996 4.394a6.75 6.75 0 0 0 2.86 2.789q1.874.972 4.488.973 1.02 0 1.828-.141a8 8 0 0 0 1.476-.41q.317-.129.575-.094a.64.64 0 0 1 .41.176q.163.176.199.457.035.28-.117.656a9.1 9.1 0 0 1-2.25 3.14 10 10 0 0 1-3.246 2.005q-1.805.69-3.739.691m0-1.793q1.454 0 2.684-.41a7.7 7.7 0 0 0 2.215-1.125 8.3 8.3 0 0 0 1.71-1.664 10 10 0 0 1-.984.164q-.562.07-1.207.07-2.94 0-5.11-1.137a8.1 8.1 0 0 1-3.327-3.246Q5.129 15.5 5.129 12.605q0-.738.094-1.464.093-.739.27-1.301a9.8 9.8 0 0 0-1.852 1.887 8.5 8.5 0 0 0-1.196 2.296 8 8 0 0 0-.422 2.625q0 1.723.622 3.235a8.4 8.4 0 0 0 1.757 2.648 8.3 8.3 0 0 0 2.649 1.782q1.511.644 3.27.644M16.637 5q.27 0 .445.164.176.165.176.434 0 .292-.176.457a.66.66 0 0 1-.445.152h-3.95a.7.7 0 0 1-.48-.164.55.55 0 0 1-.176-.422q0-.187.07-.34.083-.152.258-.398l2.766-3.586v-.059h-2.508a.63.63 0 0 1-.445-.164.58.58 0 0 1-.176-.445.58.58 0 0 1 .176-.445.63.63 0 0 1 .445-.164h3.75q.293 0 .48.164.2.152.2.433a.7.7 0 0 1-.082.317q-.082.164-.258.41l-2.73 3.597V5zm5.484 4.488q.585 0 .586.575 0 .27-.164.421a.6.6 0 0 1-.422.153h-3.047a.66.66 0 0 1-.445-.153.54.54 0 0 1-.164-.398q0-.176.07-.328.07-.165.235-.375l1.921-2.531v-.047h-1.687a.58.58 0 0 1-.41-.153.6.6 0 0 1-.164-.445q0-.246.164-.398a.56.56 0 0 1 .41-.164h2.871q.27 0 .445.152a.49.49 0 0 1 .188.398q0 .166-.082.328a2 2 0 0 1-.235.364L20.246 9.44v.047zm-5.168 3.996q.55 0 .55.551a.54.54 0 0 1-.151.399.54.54 0 0 1-.399.152h-2.707a.6.6 0 0 1-.422-.152.5.5 0 0 1-.152-.375q0-.177.058-.317.07-.152.235-.351l1.629-2.18v-.059h-1.406a.6.6 0 0 1-.399-.14q-.152-.14-.152-.41a.5.5 0 0 1 .152-.387.56.56 0 0 1 .399-.152h2.519q.258 0 .434.14a.47.47 0 0 1 .175.387q0 .152-.07.293a3 3 0 0 1-.234.363l-1.653 2.191v.047z"
        })
    });
const emptyreact = SvgEmpty;
const SvgSearch = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 24,
        height: 25,
        fill: "none",
        viewBox: "0 0 24 25",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#000",
            d: "M.55 10.336q0-1.934.727-3.621A9.462 9.462 0 0 1 6.27 1.71 9.1 9.1 0 0 1 9.903.984q1.934 0 3.621.727a9.4 9.4 0 0 1 2.989 2.016 9.4 9.4 0 0 1 2.015 2.988 9.1 9.1 0 0 1 .727 3.62q0 1.606-.516 3.048a9.3 9.3 0 0 1-1.406 2.613l5.73 5.766q.188.188.282.433.105.246.105.528 0 .387-.176.703-.164.316-.468.492a1.3 1.3 0 0 1-.703.188 1.4 1.4 0 0 1-.54-.106 1.4 1.4 0 0 1-.457-.293L15.34 17.93a9.7 9.7 0 0 1-2.531 1.289 9 9 0 0 1-2.907.468q-1.934 0-3.632-.726a9.5 9.5 0 0 1-2.977-2.016 9.5 9.5 0 0 1-2.016-2.976 9.1 9.1 0 0 1-.726-3.633m2.005 0q0 1.524.562 2.86.574 1.324 1.582 2.331 1.02 1.008 2.344 1.582 1.335.575 2.86.575a7.1 7.1 0 0 0 2.847-.575 7.469 7.469 0 0 0 3.926-3.914q.574-1.335.574-2.86a7.1 7.1 0 0 0-.574-2.847 7.4 7.4 0 0 0-1.582-2.343 7.2 7.2 0 0 0-2.344-1.582 7.1 7.1 0 0 0-2.848-.575 7.2 7.2 0 0 0-2.859.575 7.431 7.431 0 0 0-3.926 3.926 7.2 7.2 0 0 0-.562 2.847"
        })
    });
const searchreact = SvgSearch;
const SvgBrowser = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 24,
        height: 25,
        fill: "none",
        viewBox: "0 0 24 25",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#000",
            d: "M12 24.492q-2.472 0-4.64-.937a12 12 0 0 1-3.81-2.567A12.2 12.2 0 0 1 .974 17.18q-.927-2.168-.926-4.64 0-2.474.926-4.642A12.2 12.2 0 0 1 3.55 4.09a11.9 11.9 0 0 1 3.808-2.578Q9.528.586 12 .586t4.64.926a11.9 11.9 0 0 1 3.81 2.578 12 12 0 0 1 2.566 3.808q.937 2.169.937 4.641t-.937 4.64a12 12 0 0 1-6.375 6.376q-2.169.937-4.641.937m0-1.992a9.7 9.7 0 0 0 3.867-.773 10 10 0 0 0 3.176-2.145 10 10 0 0 0 2.145-3.176 9.7 9.7 0 0 0 .773-3.867 9.7 9.7 0 0 0-.773-3.867 9.9 9.9 0 0 0-2.145-3.176 10 10 0 0 0-3.176-2.144A9.7 9.7 0 0 0 12 2.578a9.7 9.7 0 0 0-3.867.774 10 10 0 0 0-3.176 2.144 9.9 9.9 0 0 0-2.144 3.176 9.7 9.7 0 0 0-.774 3.867q0 2.063.773 3.867a10 10 0 0 0 2.145 3.176 10 10 0 0 0 3.176 2.145A9.7 9.7 0 0 0 12 22.5m-4.91-4.055q-.398.188-.692.082A.63.63 0 0 1 6 18.13q-.105-.305.082-.692l3.281-6.726q.293-.574.809-.82l6.703-3.27q.621-.293.96.059.353.35.06.949l-3.27 6.715a1.76 1.76 0 0 1-.809.808zM12 13.98q.586 0 1.008-.421.422-.422.422-1.02 0-.597-.422-1.008A1.38 1.38 0 0 0 12 11.11q-.597 0-1.02.422a1.35 1.35 0 0 0-.421 1.008q0 .598.422 1.02A1.4 1.4 0 0 0 12 13.98"
        })
    });
const browserreact = SvgBrowser;
const SvgCode = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 28,
        height: 23,
        fill: "none",
        viewBox: "0 0 28 23",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#000",
            d: "m5.223 9.816 2.824-1.71-2.824-1.7q-.34-.21-.399-.515a.9.9 0 0 1 .106-.586.76.76 0 0 1 .468-.352q.317-.094.692.14l3.375 2.11q.315.2.422.55.117.353.011.704a.93.93 0 0 1-.433.563L6.09 11.129q-.375.234-.68.152a.8.8 0 0 1-.469-.363.85.85 0 0 1-.117-.586q.06-.316.399-.516m4.945 1.301q0-.315.21-.539a.73.73 0 0 1 .54-.223h4.465q.316 0 .527.223a.73.73 0 0 1 .223.54.72.72 0 0 1-.223.527.7.7 0 0 1-.527.222h-4.465a.74.74 0 0 1-.75-.75M3.863 22.332q-1.84 0-2.765-.914-.915-.903-.914-2.707V4.39q0-1.817.914-2.72.926-.913 2.765-.913h20.274q1.851 0 2.765.914.915.915.914 2.719v14.32q0 1.804-.914 2.707-.913.915-2.765.914zm.024-1.887h20.226q.868 0 1.336-.457.48-.468.48-1.383V4.496q0-.914-.48-1.383-.469-.468-1.336-.468H3.887q-.879 0-1.348.468-.468.47-.469 1.383v14.11q0 .914.47 1.382.467.457 1.347.457"
        })
    });
const codereact = SvgCode;
const SvgFile = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 28,
        height: 23,
        fill: "none",
        viewBox: "0 0 28 23",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#000",
            d: "M4.367 22.191q-1.84 0-2.765-.914-.915-.902-.915-2.718V4.273q0-1.77.844-2.648.845-.879 2.39-.879h3.34q.576 0 .997.082.433.083.785.27.363.188.75.515l.715.586q.446.375.855.54.411.151 1.008.152h11.25q1.828 0 2.754.914t.926 2.718V18.56q0 1.816-.88 2.718-.877.915-2.448.914zm.024-1.886h19.195q.867 0 1.348-.457.48-.47.48-1.371V6.629q0-.914-.48-1.383t-1.348-.469H11.879q-.575 0-1.008-.082a3 3 0 0 1-.797-.27 4 4 0 0 1-.738-.503l-.715-.598a3.2 3.2 0 0 0-.855-.539q-.399-.164-.985-.164H4.31q-.844 0-1.29.445-.444.446-.445 1.313v14.086q0 .914.469 1.383.468.457 1.348.457M1.836 9.066v-1.77H26.14v1.77z"
        })
    });
const filereact = SvgFile;
const SvgImage = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 28,
        height: 23,
        fill: "none",
        viewBox: "0 0 28 23",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#000",
            d: "M26.61 18.078q0 1.688-.797 2.555-.798.879-2.391.879H3.782q-1.314 0-1.97-.809-.655-.797-.714-2.39l4.464-4.032q.364-.339.739-.492.375-.164.773-.164.41 0 .809.176.41.164.773.492l2.168 1.957 5.297-4.734q.41-.352.844-.528a2.4 2.4 0 0 1 1.84.012q.457.176.843.54zM8.913 11.656q-.762 0-1.394-.363a2.86 2.86 0 0 1-.997-1.008 2.7 2.7 0 0 1-.375-1.394q0-.75.375-1.383T7.52 6.5q.632-.375 1.394-.375t1.383.375.996 1.008.375 1.383q0 .76-.375 1.394t-.996 1.008a2.7 2.7 0 0 1-1.383.363m-5.05 10.676q-1.841 0-2.766-.914-.915-.903-.914-2.707V4.39q0-1.817.914-2.72.926-.913 2.765-.913h20.274q1.851 0 2.765.914.915.915.914 2.719v14.32q0 1.804-.914 2.707-.913.915-2.765.914zm.023-1.887h20.226q.868 0 1.336-.457.48-.468.48-1.383V4.496q0-.914-.48-1.383-.469-.468-1.336-.468H3.887q-.879 0-1.348.468-.468.47-.469 1.383v14.11q0 .914.47 1.382.467.457 1.347.457"
        })
    });
const imagereact = SvgImage;
const SvgCheck = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 12,
        height: 13,
        fill: "none",
        viewBox: "0 0 12 13",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#00A108",
            d: "M4.564 12.1q-.402 0-.71-.396L.306 7.186a.9.9 0 0 1-.15-.247.7.7 0 0 1-.049-.252q0-.28.185-.458a.64.64 0 0 1 .472-.185q.342 0 .588.335l3.185 4.17L10.676.767A.8.8 0 0 1 10.929.5a.6.6 0 0 1 .335-.082.6.6 0 0 1 .45.17.6.6 0 0 1 .172.452.8.8 0 0 1-.041.246q-.041.117-.13.26l-6.46 10.172a.79.79 0 0 1-.69.383"
        })
    });
const checkreact = SvgCheck;
const SvgTaskError = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 15,
        height: 14,
        fill: "none",
        viewBox: "0 0 15 14",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#F80",
            d: "M2.26 13.524q-.581 0-.997-.246a1.7 1.7 0 0 1-.643-.67 1.94 1.94 0 0 1-.225-.936q0-.5.266-.957l5.305-9.242q.26-.465.69-.698.43-.24.903-.239.472 0 .895.24.431.231.697.697l5.305 9.242q.13.226.198.472.069.245.069.485 0 .519-.226.936-.225.424-.643.67-.416.246-.998.246zm.008-1.073h10.575a.7.7 0 0 0 .56-.24.79.79 0 0 0 .212-.546.9.9 0 0 0-.11-.43L8.209 1.991a.64.64 0 0 0-.287-.273.8.8 0 0 0-.362-.09q-.192 0-.37.09a.64.64 0 0 0-.287.273l-5.298 9.235a1 1 0 0 0-.082.226q-.02.116-.02.212a.8.8 0 0 0 .205.547.7.7 0 0 0 .56.24m5.29-3.54q-.525 0-.54-.54L6.93 4.753a.56.56 0 0 1 .164-.43.63.63 0 0 1 .458-.172q.273 0 .45.178a.54.54 0 0 1 .179.43l-.103 3.61q-.006.54-.52.54m0 2.22a.73.73 0 0 1-.519-.204.68.68 0 0 1-.219-.506q0-.293.22-.5a.72.72 0 0 1 .519-.211q.3 0 .52.205a.67.67 0 0 1 .218.506q0 .3-.226.506a.73.73 0 0 1-.512.205"
        })
    });
const task_errorreact = SvgTaskError;
const SvgCircle = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 15,
        height: 14,
        fill: "none",
        viewBox: "0 0 15 14",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#F80",
            d: "M7.183 1.315a.57.57 0 0 1-.417-.17.57.57 0 0 1-.171-.417.56.56 0 0 1 .17-.41.56.56 0 0 1 .418-.178q.24 0 .41.177.178.171.178.41 0 .247-.178.418a.56.56 0 0 1-.41.17m1.955.322a.57.57 0 0 1-.417-.171.57.57 0 0 1-.171-.417.56.56 0 0 1 .17-.41.56.56 0 0 1 .418-.178q.24 0 .41.178.178.17.178.41 0 .246-.178.417a.56.56 0 0 1-.41.17m1.777.895a.57.57 0 0 1-.417-.17.57.57 0 0 1-.17-.418.56.56 0 0 1 .17-.41.56.56 0 0 1 .417-.178q.24 0 .41.178.178.17.178.41 0 .246-.178.417a.56.56 0 0 1-.41.171m1.401 1.408a.58.58 0 0 1-.588-.587q0-.247.171-.417a.58.58 0 0 1 .417-.171.56.56 0 0 1 .41.17.56.56 0 0 1 .178.418.57.57 0 0 1-.177.417.56.56 0 0 1-.41.17m.896 1.75a.58.58 0 0 1-.588-.587.56.56 0 0 1 .17-.41.57.57 0 0 1 .828 0q.178.17.178.41a.57.57 0 0 1-.178.417.56.56 0 0 1-.41.17m.335 1.962a.58.58 0 0 1-.588-.588.56.56 0 0 1 .17-.41.57.57 0 0 1 .418-.177q.246 0 .417.177a.56.56 0 0 1 .17.41.58.58 0 0 1-.587.588m-.335 1.962a.58.58 0 0 1-.588-.588.56.56 0 0 1 .17-.41.57.57 0 0 1 .828 0q.178.17.178.41 0 .246-.178.417a.56.56 0 0 1-.41.171m-.896 1.757a.58.58 0 0 1-.588-.588q0-.246.171-.417a.58.58 0 0 1 .417-.17.56.56 0 0 1 .41.17.56.56 0 0 1 .178.417.57.57 0 0 1-.177.417.56.56 0 0 1-.41.171m-1.401 1.402a.56.56 0 0 1-.417-.178.56.56 0 0 1-.17-.41.56.56 0 0 1 .17-.41.56.56 0 0 1 .417-.178q.24 0 .41.177.178.171.178.41 0 .24-.178.41a.55.55 0 0 1-.41.179m-1.777.895a.56.56 0 0 1-.417-.178.56.56 0 0 1-.171-.41.58.58 0 0 1 .588-.588.56.56 0 0 1 .41.171.57.57 0 0 1 0 .827.55.55 0 0 1-.41.178m-1.955.321a.56.56 0 0 1-.417-.178.56.56 0 0 1-.171-.41.58.58 0 0 1 .588-.588.56.56 0 0 1 .41.171.57.57 0 0 1 0 .828.55.55 0 0 1-.41.177m-1.955-.321a.56.56 0 0 1-.417-.178.56.56 0 0 1-.171-.41.58.58 0 0 1 .588-.588.56.56 0 0 1 .41.171.57.57 0 0 1 0 .827.55.55 0 0 1-.41.178m-1.778-.895a.56.56 0 0 1-.417-.178.56.56 0 0 1-.17-.41.56.56 0 0 1 .17-.41.56.56 0 0 1 .417-.178q.24 0 .41.177.178.171.178.41 0 .24-.178.41a.55.55 0 0 1-.41.179M2.042 11.37a.58.58 0 0 1-.588-.588q0-.246.171-.417a.58.58 0 0 1 .417-.17.56.56 0 0 1 .41.17.56.56 0 0 1 .178.417.57.57 0 0 1-.178.417.56.56 0 0 1-.41.171m-.896-1.757a.58.58 0 0 1-.587-.588.56.56 0 0 1 .17-.41.57.57 0 0 1 .417-.178q.248 0 .417.178a.56.56 0 0 1 .171.41.57.57 0 0 1-.17.417.57.57 0 0 1-.418.171M.812 7.652a.58.58 0 0 1-.588-.588.56.56 0 0 1 .17-.41.57.57 0 0 1 .828 0q.177.171.177.41a.57.57 0 0 1-.177.417.56.56 0 0 1-.41.171m.334-1.962a.58.58 0 0 1-.587-.587.56.56 0 0 1 .17-.41.57.57 0 0 1 .417-.178q.248 0 .417.177a.56.56 0 0 1 .171.41.58.58 0 0 1-.588.588m.896-1.75a.58.58 0 0 1-.588-.587q0-.247.171-.417a.58.58 0 0 1 .417-.171.56.56 0 0 1 .41.17.56.56 0 0 1 .178.418.57.57 0 0 1-.178.417.56.56 0 0 1-.41.17M3.45 2.532a.57.57 0 0 1-.417-.17.57.57 0 0 1-.17-.418.56.56 0 0 1 .17-.41.56.56 0 0 1 .417-.178q.24 0 .41.178.178.17.178.41 0 .246-.178.417a.56.56 0 0 1-.41.171m1.778-.895a.57.57 0 0 1-.417-.171.57.57 0 0 1-.171-.417.56.56 0 0 1 .17-.41.56.56 0 0 1 .418-.178q.239 0 .41.178.177.17.177.41 0 .246-.177.417a.56.56 0 0 1-.41.17"
        })
    });
const circlereact = SvgCircle;
const SvgArrow = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 16,
        height: 13,
        fill: "none",
        viewBox: "0 0 16 13",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#F80",
            d: "M15.25 6.36a.7.7 0 0 1-.234.523l-5.196 5.18a.71.71 0 0 1-.508.218.66.66 0 0 1-.484-.195.63.63 0 0 1-.195-.477.8.8 0 0 1 .047-.265.6.6 0 0 1 .14-.227l1.75-1.781 3.102-2.82.156.382-2.515.157H1.43a.68.68 0 0 1-.5-.196.7.7 0 0 1-.188-.5q0-.305.188-.5a.68.68 0 0 1 .5-.195h9.882l2.516.156-.156.39-3.102-2.827-1.75-1.781a.6.6 0 0 1-.14-.22.8.8 0 0 1-.047-.273q0-.288.195-.476a.66.66 0 0 1 .485-.195q.14 0 .265.054a.8.8 0 0 1 .258.18l5.18 5.164a.7.7 0 0 1 .234.523"
        })
    });
const arrowreact = SvgArrow;
const SvgPhone2 = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: 24,
        height: 25,
        fill: "none",
        viewBox: "0 0 24 25",
        ...props,
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("path", {
            fill: "#000",
            d: "M17.203 21.89V10.103q0-.657-.375-1.008-.375-.364-1.066-.364H8.215q-.692 0-1.067.364-.363.351-.363 1.008V21.89h-1.71V9.832q0-1.265.796-2.039.81-.773 2.121-.773h7.992q1.313 0 2.121.773.81.773.81 2.039v12.059zM10.7 11.005a.77.77 0 0 1-.55-.211.74.74 0 0 1-.223-.54q0-.316.222-.526a.75.75 0 0 1 .551-.223h2.602q.315 0 .527.223.223.21.223.527 0 .315-.223.539a.72.72 0 0 1-.527.21zM12 24.492q-2.472 0-4.64-.937a12 12 0 0 1-3.81-2.567A12.2 12.2 0 0 1 .974 17.18q-.927-2.168-.926-4.64 0-2.474.926-4.642A12.2 12.2 0 0 1 3.55 4.09a11.9 11.9 0 0 1 3.808-2.578Q9.528.586 12 .586t4.64.926a11.9 11.9 0 0 1 3.81 2.578 12 12 0 0 1 2.566 3.808q.937 2.169.937 4.641t-.937 4.64a12 12 0 0 1-6.375 6.376q-2.169.937-4.641.937m0-1.992a9.7 9.7 0 0 0 3.867-.773 10 10 0 0 0 3.176-2.145 10 10 0 0 0 2.145-3.176 9.7 9.7 0 0 0 .773-3.867 9.7 9.7 0 0 0-.773-3.867 9.9 9.9 0 0 0-2.145-3.176 10 10 0 0 0-3.176-2.144A9.7 9.7 0 0 0 12 2.578a9.7 9.7 0 0 0-3.867.774 10 10 0 0 0-3.176 2.144 9.9 9.9 0 0 0-2.144 3.176 9.7 9.7 0 0 0-.774 3.867q0 2.063.773 3.867a10 10 0 0 0 2.145 3.176 10 10 0 0 0 3.176 2.145A9.7 9.7 0 0 0 12 22.5"
        })
    });
const phone2react = SvgPhone2;
const ToolIconPhone = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: phonereact,
        ...props
    });
const ToolIconDefault = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolOutlined, {
        ...props
    });
const ToolIconEmpty = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: emptyreact,
        ...props
    });
const ToolIconSearch = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: searchreact,
        ...props
    });
const ToolIconBrowser = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: browserreact,
        ...props
    });
const ToolIconCode = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: codereact,
        ...props
    });
const ToolIconFile = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: filereact,
        ...props
    });
const ToolIconImage = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: imagereact,
        ...props
    });
const ToolIconCheck = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: checkreact,
        ...props
    });
const ToolIconTaskError = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: task_errorreact,
        ...props
    });
const ToolIconCircle = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: circlereact,
        ...props
    });
const ToolIconArrow = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: arrowreact,
        ...props
    });
const ToolIconPhone2 = (props)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(icons, {
        component: phone2react,
        ...props
    });
function registry_define_property(obj, key, value) {
    if (key in obj) Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
    });
    else obj[key] = value;
    return obj;
}
class MessageTypeRegistry {
    registerMessageType(config) {
        const { type } = config;
        if ('string' == typeof type) {
            if (this.stringTypes.has(type)) console.warn(`[MessageTypeRegistry] type '${type}' \u{5DF2}\u{6CE8}\u{518C}\u{FF0C}\u{5C06}\u{88AB}\u{8986}\u{76D6}`);
            this.stringTypes.set(type, config);
        } else if (Array.isArray(type)) this.arrayTypes.push({
            types: type,
            config
        });
        else if (type instanceof RegExp) this.patternTypes.push({
            pattern: type,
            config
        });
    }
    getMessageType(type) {
        const exactMatch = this.stringTypes.get(type);
        if (exactMatch) return exactMatch;
        for (const { types, config } of this.arrayTypes)if (types.includes(type)) return config;
        for (const { pattern, config } of this.patternTypes)if (pattern.test(type)) return config;
    }
    getBriefRenderer(type) {
        const config = this.getMessageType(type);
        return (null == config ? void 0 : config.briefRenderer) || this.defaultBriefRenderer;
    }
    getDetailRenderer(type) {
        const config = this.getMessageType(type);
        return (null == config ? void 0 : config.detailRenderer) || this.defaultDetailRenderer;
    }
    getToolIcon(type) {
        const config = this.getMessageType(type);
        return (null == config ? void 0 : config.icon) || this.defaultIcon;
    }
    constructor(){
        registry_define_property(this, "stringTypes", new Map());
        registry_define_property(this, "patternTypes", []);
        registry_define_property(this, "arrayTypes", []);
        registry_define_property(this, "defaultBriefRenderer", default_DefaultBriefRenderer);
        registry_define_property(this, "defaultDetailRenderer", default_DefaultDetailRenderer);
        registry_define_property(this, "defaultIcon", ToolIconDefault);
    }
}
const registry_registry = new MessageTypeRegistry();
const registry = registry_registry;
const MessageBrief = ({ message, ...props })=>{
    const Brief = registry.getBriefRenderer(message.type);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Brief, {
        message: message,
        ...props
    });
};
const common_MessageBrief = MessageBrief;
const LottieComponent = ({ animationData, style })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(lottie_react, {
        animationData: animationData,
        loop: true,
        style: style
    });
const Lottie = LottieComponent;
var running_namespaceObject = JSON.parse('{"assets":[{"h":80,"id":"0","p":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAACXBIWXMAACxLAAAsSwGlPZapAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAA1HSURBVHgB7VxNbFxXFT7nzniSbOhkySovSEiwis0CUlSU54p9HYkFbLBTUalFKrERoBSVekIXqWhRxkWoLBBxdt3Z2WXRxs8bGujCE4TaSkXKq1hUgkUmxVWSmffu5Zx7zn0znvH/X5yxjzJ5837H873v/J83AEdyJEdyJIdXEB6juHii2m5BBJjHJWNPWWcjh27YoKOd9hSABQcOES0ffZfe30d0Tedsw4BLrbF3hpKbCTxG2XcAXTxZbbe/mCBUngPIhwmkKghggLJ0YBzyuiMA6Q2dRduQgKSlBb/k7Y7A9sfRvqSEOAtgFjG5mcI+yr4A6EF79GAcDYwB2hhcToDwZ3tm0SuXJXqwPJCOgQF5oQdQjveg+r/a72PEEXQbn0PsTQjVWUyS67APsqcAMnBZq3WRvuIkM42BQWKYMCf3rBIQPAC0N/fMElByF9SXlnqeRWWkgs2H5k7ODTdDwKTj79LnXDdQvk5gprBHsicACnD2Ir0j8OxJjwkGdVQAPAgrWSTrzjPOqapCAFCAxsDS7uso6NAFLHM4mIXUGJjFW3+9DHsguw5g+5lfxM7m1+jLRAUYar+IJdi1Dr1ABJDF9llYCZYyUt+rymMAG3qOD7ZT9vn1lBzPFCZ/n4ddlF0D0MW1atZeniYyTLoVbBAwlEVQ2C7UL12AJ+rYvR31OA+oE1UP+/WGKIhObg52QCu2CeudvzHedLi6gewyJo0m7ILsCoAPzl6KSugWiEGRMCgA2KdqIOyR7WLTbFBP+YLh2K5znXcy5CAUlM4N6GIvdByQhj9QMFGdEp9vBfDUODtKIKawQ9kxgO1nXmWVnSN785SqHwYDj6x2nVBDmWg7TEQP3H36IxoOswadfYewagxVbBOTd9Puz3HxWJRBRjcorzprY/LoZ9Dl59wKu9hrZ12PGWCWu8Dye87g8+X3GztS6R0B2Hr6NXIUeb3/j1RVdMqUwrZJuEIgNGlfQjHHTLmcNTCZ3ZY6EajVHP4X098wRp8/DoWzkRspcaUrPLbcPADoiiMNRQj4/j9mYJuybQDbZ1+bpj9pWkKNwvCvAC44DtDwhf7wJhj7drl8vI5JfVdsUBAXx1EOeUw3Z9pnMYY+0gVzAFCABkH1XQdEsDW89dG2vPS2AGx95/WLlH5d9cGrt0neK3oYjXrZgomSVTSJfTOVSnnXgVtN2vHZGtm7cbbJ0KXSKwG0Gj9KuEM7p0q3Pq7DFmXLAD56+vUx+jvmgnEObOtKu6DjAXP+025QAjZ14nY9hX0UF59lRtbIGY178+JCNhMcnD8KOnEnwW1gdOi9T5ItfMzWAHxw9kpE3muJVPYpYZ7T/NWnZqB2UFOuvElvapUP3ty2fdkNacXfmiyBnSZNqHoQ+TtjsJUhgwH9Hu4eVsy38OYn6Wavv2kAOc5rPTy2RCec4oygYFww0K7LBkKeQpafr3z4ZgMOgLh4mKs8C3RTT2mYpZ7b7xX7LMrMNz81X8lHcD7dlKkxsElpPzhBxhkj+RD+fEOfaNgKg1+nWwzoC1Ep8XH0oIDHwvEe3ddRAuszb5+xyy6ixomSOvJ/ESyb6U1fezMHPfr2W2OEz5zGUdCfjxZJvAfvxO1aCgdQXPwNYiJSwO8iVziXYIZct12kw9yz+F6abHTNTTHQGrzKbCuY5j/JeN+BvES+jDnQ4LFg8gkx0Y0SPqmvDGEHRKfZioQ+tObcNTcWVTe65oYAfvndGYr1zCmLAhpHfahgOq+yHKVg08LQgQYvCIOYOXvecWjluitCHXXWYDyCL7iitL6sC+C9s1cpFHATOecSHJRwbEoM5HuHruQESMNKcPnE7VdSeEKkknzK9vmygCXlr06m4oryGeXqkxuxcH0GlsvjFk1EL8i5tMkxO1/a1zj8i96Z2eN/+/WWA9DHLaVb/6qT950PhQx1IKCFWVRPXbXLrcn1rrMugATUBIHm/IszWLpkbhBzBpSWpMIpBat7UqjcDyHtnSKe3YdQBXe5W+EY/bemovA6LFwTwP98748TpLIRM8+rMJV1PQMR9cWqa2afJNXtFUxSKrLaOhRxYSjYOqkUSab1lF1+MLHWNdYEMDel8ZwvR0RzWHK5gpZ7EGkdMD1xe+qJZV8htkyZkmsWpS/stAU0xOFv/txap68K4OfxO2T3MA62L/P2j0H06gziVEo1GAAhFjZJx+qkvqKyofKtS6mGu3NrqfGqAD6EUpyrquaqtsH+EZiQkTrDUGkRBkWyh8JCdh1GCw5Fx1BbAcvLE6uduroKoxmnArjLhYH64hhQHQqWZk8mL6UwIIJJk1hIBV5WXykGQ3d1WwLufFU1XhVAchjnmG3eWbDzMCVv/1iVc2OwjXgDBk9m1OtCd8U69FN45MSNVfvUuA/AT79/LZaYT5kHBQOJkew8aAmVBAZNsqzBauyLCs52tVAFTHpV4UsqNPRIH4BtgOHC9hHzcvW8Ev95Ri6eTi7seVV5v0XU2DUQiwaYc13dQ1ZtKgzHvef1AciZR2H7fNYhdi+AmKE5MGWq3RZrsztOPC9K878TVDuf+XOLYKWUezc4UzojpR4s/mnjwF+ojHZwvG+PGOMa8t2l3uQ6MDAr2SZGvef0AZgBVLk8hTLRoxCyXfCXZEYOnPp2SUNqg7rmVdkbQKl+AZzpPWEVBpoqQy3dNKPtSb0NUvVOYVCllDc5nmayUc9apuxAv79/W0BbSJ8NzNkGdhUM2BZm+uL1kZs/SmFABW8+TLUmqME0N+dB254+pDnde04fA3PUKr8UxRR9UKu440mQJ0C05akdPM8/bYZ6ZvbIKgAaOV/OW8nZw4AfT0+QH+jwxqH6klVltTBG818JXTplLF9MgIEXtA0IIykaTHfmtG1fBtYPoMFUwOO0DTWI5jQOvF1cGJuLYJAF3QVC6j6/dRD8hlfd++RYp3oP73cigB4sqUKXioKCz0oIyDbTe4AFb0KKpjKS49B8boYIj3KTUthFAm+E9/Ue32cDye80iLgRFF1SITH6hhItShWOhQY2G2Fhb0yL85s5to+BFK585u0g7cog2D/DNUD0qgx2BI6kkD4GginftRxA+kCa6hI6ihOGwsg3n4EjKaTfBhpYDIG0eGCyg+xMigKrGZ4bWxhoO7gV6QOw1W6xF27akIF0ZSUa2lSz49kwHImXPgDPz59vUjrYEA+szxYFO4iS2tFrw5GHwyKrR8bGzHMTiduZ7Dx6C6yk1ufmJo7UmGV1AB8NXWf7V8zEaGbCDb7cM9Gc/KJVPmIhrJPdvvvDWwvkdc/5ZCY8qOCzYwaR1809U25/7cLs6CDXBzeUNZNbsnc3rHbmstAj5u28zXfq8GTLHj/0LFwTwPYxmCV1bXpHoj1hKvfzA1P68jHixXcmPojgEMuaALJqEmj1MEykHji0O31/mJh4kpzMVTjEsv54WzmbIedxrzPmEQaM/COCzveMwYz9/vkPJ+GQyroAMgsJuBkZqvTjbM52wMQALKn29O9eWDqUwfWGFdKyac3wIKWEMDorqIG1n5URUKv0mrvy4lIEh0w2BJBZ2Ea4IB4ZwngvORR50rfLLka5K9+68uLHERwi2VSN/uXZpxOydzNOZ6RzjQtlzBd1JMerefQI7ULtEIG46SaHdUM1AirttoXAE/s6PyjqzGV/jNoGFy5NHg4QNw3g1OxIE2xplBjXDA/qiz0UNnZP79Mycllp6Vcvfzrw3nnLjcorP1mKyewtSM+qJI806yMQEt4QE404mkzeXwc0l+v10ykMoGy5T/nKn0cSwn1S7KH07qXkBVyt1magt5V+moTUfZzeL/z05/+ehgGUbbfKX3/xDtlEw4+BSd1Qg+ww1ZpxOyBMufqesmdlSu2Cy+1KKZl946spDIDsaNag9tI/JwnEq1YdiDWqwtgZD879OmDRGgWefihxGHSd2gc3lo9VkvnaySe2orPjYY1XX/pojFT2L1yd6QLPhfjQFgD6foorHhsznbSQQE4om2lkFhfhGBKY5XS+diKFJ0B2ZdrlEsd9JbNAjIuKJ5kgTPaH+eqgzp3Jf6uNK5nDlod5pPLt00QGG/2ULFXIoVyeSl45eKN1uzLs8safvpk+HKqMkBrXix8UwfALLbIuo0qSxfgdxY8yQWcbaPlW5/BkMtSPeo65LF+KrzyI4IDJrk0LUZjSfOsPX58ixM4T++4KFOFhUlc84x5+8gHkpwKKWVCQJ5FBB+oQXddPMgjOVcxL1+CAyZ4NrP1s8m6N1PHHPLDpg2x5ulOdiPZY9CHGHMLTUMGGakzphzp98dZv49+fWXytchIOkOzZvNrb9dO13Nln6e1v6ft/5mNF3oEyLqxTDjp/GGZnO78qFAT9Ixq6TlUfOGCybyOTL/zy84kMgB/gjtWBCAPBO40ihlSnIb/X5lsIiMpgtpXzi78pb2roZ79k32dOJy59HrWgFBMY4xSEn/PBNmCPCne8tZMlb79PnnjkoHnixz60+4NL/42hVB6mvPkUuZFhCrCrGWDVYRESUfHCNPKhoQsHMYw5kiM5kiM5zPJ/P3kwiK7pqWYAAAAASUVORK5CYII=","u":"","w":80,"e":1},{"id":"6","layers":[{"ind":5,"ty":2,"parent":4,"ks":{},"ip":0,"op":61,"st":0,"refId":"0"},{"ind":4,"ty":3,"ks":{"s":{"a":0,"k":[50,50]}},"ip":0,"op":61,"st":0}]}],"fr":60,"h":40,"ip":0,"layers":[{"ind":8,"ty":0,"parent":3,"ks":{},"w":40,"h":40,"ip":0,"op":61,"st":0,"refId":"6"},{"ind":3,"ty":3,"parent":2,"ks":{"a":{"a":0,"k":[20,20]},"p":{"a":0,"k":[20,20]},"r":{"a":1,"k":[{"t":0,"s":[0],"i":{"x":1,"y":1},"o":{"x":0,"y":0}},{"t":60,"s":[360],"h":1}]}},"ip":0,"op":61,"st":0},{"ind":2,"ty":3,"parent":1,"ks":{},"ip":0,"op":61,"st":0},{"ind":9,"ty":4,"parent":1,"ks":{},"ip":0,"op":61,"st":0,"shapes":[{"ty":"rc","p":{"a":0,"k":[20,20]},"r":{"a":0,"k":0},"s":{"a":0,"k":[40,40]}},{"ty":"fl","c":{"a":0,"k":[1,1,1]},"o":{"a":0,"k":100}}]},{"ind":1,"ty":3,"ks":{},"ip":0,"op":61,"st":0}],"meta":{"g":"https://jitter.video"},"op":60,"v":"5.7.4","w":40}');
const Loading = ({ size = 16 })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(Lottie, {
        animationData: running_namespaceObject,
        style: {
            width: `${size}px`,
            height: `${size}px`
        }
    });
const Infra_Loading = Loading;
const Chatbot_Chatbot = ({ shareButtonNode })=>{
    const { Header } = Layout;
    const { Title, Text } = Typography;
    const navigate = useNavigate();
    const { t } = useTranslation_useTranslation();
    const { mode, sessionInfo, basePath, backPath, pipelineMessages, taskStage, workspaceVisible, setWorkspaceVisible, setPipelineTargetMessage, workspaceMessages } = agent();
    null == sessionInfo || sessionInfo.status;
    const actionItems = [
        {
            key: 'retry',
            icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(RedoOutlined, {}),
            label: 'Retry'
        },
        {
            key: 'copy',
            icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(CopyOutlined, {}),
            label: 'Copy'
        },
        {
            key: 'share',
            icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(ShareAltOutlined, {}),
            label: 'Share'
        }
    ];
    const suggestionItems = [
        {
            key: 'a',
            label: /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(FireOutlined, {
                        style: {
                            color: '#FF4D4F'
                        }
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Text, {
                        children: 'Hot Topics'
                    })
                ]
            }),
            description: 'What are you interested in?',
            children: [
                {
                    key: 'a-a',
                    description: "First Question?"
                },
                {
                    key: 'a-b',
                    description: "Second Question?"
                },
                {
                    key: 'a-c',
                    description: "Third Question?"
                }
            ]
        }
    ];
    const handleWorkspaceOpen = ()=>{
        setWorkspaceVisible(true);
    };
    const autoOpenRef = (0, external_react_.useRef)(false);
    (0, external_react_.useEffect)(()=>{
        if ((null == workspaceMessages ? void 0 : workspaceMessages.length) > 0 && !workspaceVisible && !autoOpenRef.current) {
            setWorkspaceVisible(true);
            autoOpenRef.current = true;
        }
    }, [
        setWorkspaceVisible,
        null == workspaceMessages ? void 0 : workspaceMessages.length,
        workspaceVisible
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: classnames('h-full flex-auto bg-white overflow-hidden bg-bottom bg-no-repeat', {
            'bg-[length:120%_244px]': mode === types_AgentMode.Chatbot,
            '2xl:bg-[length:1616px_244px]': mode === types_AgentMode.Chatbot,
            'xl:bg-[length:1012px_244px]': mode === types_AgentMode.Chatbot,
            'bg-[length:120%_108px]': mode === types_AgentMode.Replay,
            '2xl:bg-[length:1616px_108px]': mode === types_AgentMode.Replay,
            'xl:bg-[length:1012px_108px]': mode === types_AgentMode.Replay
        }),
        style: {
            backgroundImage: `url(${footer_bg_namespaceObject})`
        },
        children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
            vertical: true,
            className: "h-full !px-4 !pb-[20px]",
            children: [
                /*#__PURE__*/ (0, jsx_runtime_.jsx)(Header, {
                    className: "h-[64px] !bg-white !p-0",
                    children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
                        justify: "space-between",
                        className: "h-full",
                        children: [
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)(Flex, {
                                className: "w-1/3",
                                justify: "start",
                                align: "center",
                                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                                    type: "text",
                                    icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
                                        src: back_namespaceObject
                                    }),
                                    onClick: ()=>{
                                        navigate(`${backPath || basePath}`);
                                    }
                                })
                            }),
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)(Flex, {
                                className: "w-1/3",
                                justify: "center",
                                align: "center",
                                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Title, {
                                    level: 4,
                                    className: "truncate !mb-0",
                                    children: (null == sessionInfo ? void 0 : sessionInfo.title) || ''
                                })
                            }),
                            /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
                                className: "w-1/3 [&_.ant-btn-icon-only]:!w-[40px]",
                                justify: "end",
                                align: "center",
                                children: [
                                    shareButtonNode ? shareButtonNode : null,
                                    !workspaceVisible && /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                                        type: "text",
                                        icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
                                            src: zoom_in_namespaceObject
                                        }),
                                        onClick: handleWorkspaceOpen,
                                        className: "ml-[12px]"
                                    })
                                ]
                            })
                        ]
                    })
                }),
                /*#__PURE__*/ (0, jsx_runtime_.jsx)(react_scroll_to_bottom, {
                    className: "mx-auto w-full max-w-full 2xl:max-w-[1216px] xl:max-w-[904px] flex flex-col gap-[16px] p-4 flex-auto overflow-auto",
                    scrollViewClassName: "chat-scrollbar",
                    initialScrollBehavior: "smooth",
                    followButtonClassName: "follow-btn-none",
                    children: pipelineMessages.map((message, idx)=>{
                        if ('user' === message.role) return message.messages.map((msg, idx)=>{
                            const actionItems = msg.loading ? [] : [
                                {
                                    key: 'copy',
                                    icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(CopyOutlined, {}),
                                    label: 'Copy'
                                }
                            ];
                            return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                                className: "flex items-center gap-2 justify-end",
                                children: [
                                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Actions, {
                                        items: actionItems,
                                        onClick: (info)=>{
                                            if ('copy' === info.key) try {
                                                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg.content);
                                                else {
                                                    const textArea = document.createElement('textarea');
                                                    textArea.value = msg.content;
                                                    document.body.appendChild(textArea);
                                                    textArea.select();
                                                    document.execCommand('copy');
                                                    document.body.removeChild(textArea);
                                                }
                                                external_antd_message.success(t('code.copy.success'));
                                            } catch (error) {
                                                console.error('Copy failed:', error);
                                            }
                                        }
                                    }),
                                    msg.loading ? /*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_Loading, {}) : null,
                                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Bubble, {
                                        typing: true,
                                        placement: "end",
                                        styles: {
                                            content: {
                                                backgroundColor: '#E1F1FF'
                                            }
                                        },
                                        content: /*#__PURE__*/ (0, jsx_runtime_.jsxs)(external_react_.Fragment, {
                                            children: [
                                                /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_MessageBrief, {
                                                    message: msg
                                                }),
                                                /*#__PURE__*/ (0, jsx_runtime_.jsx)(MessageAttachments, {
                                                    message: msg
                                                })
                                            ]
                                        }, idx)
                                    })
                                ]
                            }, idx);
                        });
                        if ('assistant' === message.role) {
                            const hasUserInput = message.messages.some((msg)=>'user_input' === msg.type);
                            return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Bubble, {
                                typing: true,
                                placement: "start",
                                className: "my-3",
                                styles: {
                                    content: {
                                        backgroundColor: '#ffffff',
                                        padding: 0
                                    }
                                },
                                content: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Flex, {
                                    vertical: true,
                                    gap: "middle",
                                    children: message.messages.map((msg, idx)=>{
                                        if (isToolMessage(msg)) {
                                            var _msg_detail;
                                            return /*#__PURE__*/ (0, jsx_runtime_.jsxs)(external_react_.Fragment, {
                                                children: [
                                                    msg.content && /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
                                                        content: msg.content,
                                                        className: "text-sm text-gray-500"
                                                    }),
                                                    /*#__PURE__*/ (0, jsx_runtime_.jsxs)(ClickableTool, {
                                                        onClick: ()=>setPipelineTargetMessage(msg),
                                                        active: (null == (_msg_detail = msg.detail) ? void 0 : _msg_detail.status) === 'pending',
                                                        children: [
                                                            /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_MessageBrief, {
                                                                message: msg,
                                                                hasUserInput: hasUserInput
                                                            }),
                                                            /*#__PURE__*/ (0, jsx_runtime_.jsx)(MessageAttachments, {
                                                                message: msg
                                                            })
                                                        ]
                                                    }, idx)
                                                ]
                                            }, idx);
                                        }
                                        return /*#__PURE__*/ (0, jsx_runtime_.jsxs)(external_react_.Fragment, {
                                            children: [
                                                /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_MessageBrief, {
                                                    message: msg,
                                                    hasUserInput: hasUserInput
                                                }),
                                                /*#__PURE__*/ (0, jsx_runtime_.jsx)(MessageAttachments, {
                                                    message: msg
                                                })
                                            ]
                                        }, idx);
                                    })
                                }),
                                footer: taskStage === types_TaskStage.Success ? /*#__PURE__*/ (0, jsx_runtime_.jsxs)(jsx_runtime_.Fragment, {
                                    children: [
                                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(Actions, {
                                            items: actionItems
                                        }),
                                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(ConfigProvider, {
                                            theme: {
                                                algorithm: theme.defaultAlgorithm
                                            },
                                            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Card, {
                                                style: {
                                                    borderRadius: 0,
                                                    border: 0
                                                },
                                                className: "w-full",
                                                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Prompts, {
                                                    title: "You might also want to ask",
                                                    items: suggestionItems,
                                                    wrap: true,
                                                    styles: {
                                                        item: {
                                                            flex: 'none',
                                                            width: 'calc(30% - 6px)',
                                                            backgroundImage: "linear-gradient(137deg, #e5f4ff 0%, #efe7ff 100%)",
                                                            border: 0
                                                        },
                                                        subItem: {
                                                            background: 'rgba(255,255,255,0.45)',
                                                            border: '1px solid #FFF'
                                                        }
                                                    },
                                                    onItemClick: (info)=>{
                                                        console.info(`You have clicked the suggestion: ${info.data.key}`);
                                                    }
                                                })
                                            })
                                        })
                                    ]
                                }) : null
                            }, idx);
                        }
                    })
                }),
                /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                    className: "mx-auto w-full max-w-full 2xl:max-w-[1216px] xl:max-w-[904px]",
                    children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Chatbot_Sender, {})
                })
            ]
        })
    });
};
const Chatbot = Chatbot_Chatbot;
const Controller_Controller = ({ onRealTimeChange })=>{
    const [step, setStep] = (0, external_react_.useState)(0);
    const { t } = useTranslation_useTranslation();
    const { senderSending, workspaceMessages, pipelineTargetMessage, setPipelineTargetMessage } = agent();
    const totalSteps = (0, external_react_.useMemo)(()=>workspaceMessages.length, [
        workspaceMessages
    ]);
    const isRealTime = (0, external_react_.useMemo)(()=>!pipelineTargetMessage || senderSending && step === totalSteps, [
        pipelineTargetMessage,
        senderSending,
        step,
        totalSteps
    ]);
    const showRealTime = (0, external_react_.useMemo)(()=>!isRealTime && step !== totalSteps, [
        isRealTime,
        step,
        totalSteps
    ]);
    (0, external_react_.useEffect)(()=>{
        onRealTimeChange(!showRealTime);
    }, [
        showRealTime,
        onRealTimeChange
    ]);
    const manualToStep = (0, external_react_.useCallback)((step)=>{
        setStep(step);
        setPipelineTargetMessage(workspaceMessages[step > 1 ? step - 1 : 0]);
    }, [
        setPipelineTargetMessage,
        workspaceMessages
    ]);
    const handlePreStep = (0, external_react_.useCallback)(()=>{
        const currentStep = step - 1;
        if (currentStep > 0) manualToStep(currentStep);
    }, [
        manualToStep,
        step
    ]);
    const handleNextStep = (0, external_react_.useCallback)(()=>{
        manualToStep(step + 1 < totalSteps ? step + 1 : totalSteps);
    }, [
        manualToStep,
        step,
        totalSteps
    ]);
    const handleStepChange = (0, external_react_.useCallback)((value)=>{
        if (0 !== value) manualToStep(value);
    }, [
        manualToStep
    ]);
    const returnToRealTime = (0, external_react_.useCallback)(()=>{
        setStep(totalSteps);
        setPipelineTargetMessage(null);
    }, [
        setPipelineTargetMessage,
        totalSteps
    ]);
    (0, external_react_.useEffect)(()=>{
        if (isRealTime) setStep(totalSteps);
    }, [
        isRealTime,
        totalSteps
    ]);
    (0, external_react_.useEffect)(()=>{
        if (pipelineTargetMessage) setStep(workspaceMessages.findIndex((message)=>message.id === pipelineTargetMessage.id) + 1);
    }, [
        pipelineTargetMessage,
        workspaceMessages
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "agentx-controller relative flex w-full gap-[12px] px-[18px] py-2",
        children: [
            !isRealTime && step !== totalSteps && /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "absolute left-1/2 top-[-36px] z-10 -translate-x-1/2 -translate-y-1/2 py-3 px-5 font-medium rounded-full bg-[#fff] shadow-[0px_2px_20px_0px_rgba(0,_0,_0,_0.12)] cursor-pointer flex items-center gap-[4px]",
                onClick: returnToRealTime,
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_CustomIcon, {
                        type: "caretRight",
                        style: {
                            fontSize: '16px'
                        }
                    }),
                    t('workspace.controller.jump-to-real-time')
                ]
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "flex items-center gap-[4px]",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                        type: "link",
                        icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_CustomIcon, {
                            type: "stepBackward"
                        }),
                        style: {
                            width: 20,
                            padding: 0,
                            fontSize: '20px',
                            color: '#000'
                        },
                        onClick: handlePreStep
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                        type: "link",
                        icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_CustomIcon, {
                            type: "stepForward"
                        }),
                        style: {
                            width: 20,
                            padding: 0,
                            fontSize: '20px',
                            color: '#000'
                        },
                        onClick: handleNextStep
                    })
                ]
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "flex-1",
                children: [
                    totalSteps <= 1 && /*#__PURE__*/ (0, jsx_runtime_.jsx)(Slider, {
                        min: 0,
                        max: totalSteps,
                        value: step,
                        onChange: handleStepChange
                    }),
                    totalSteps > 1 && /*#__PURE__*/ (0, jsx_runtime_.jsx)(Slider, {
                        min: 1,
                        max: totalSteps,
                        value: step,
                        onChange: handleStepChange
                    })
                ]
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "flex items-center gap-[8px]",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Badge, {
                        status: isRealTime && senderSending ? 'success' : 'default'
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
                        children: t('workspace.controller.real-time')
                    })
                ]
            })
        ]
    });
};
const Controller = Controller_Controller;
const ICON_STYLES = {
    success: {
        color: '#4AC90F'
    },
    default: {
        fontSize: '12px'
    }
};
const NumberCircle = ({ number })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "flex items-center justify-center flex-none w-5 h-5 rounded-full bg-[#999] text-white text-xs",
        children: number
    });
const TaskProgress_TaskProgress = ()=>{
    var _taskPlan_at;
    const { t } = useTranslation_useTranslation();
    const [isExpanded, setIsExpanded] = (0, external_react_.useState)(false);
    const { taskPlan } = agent();
    const totalSteps = (0, external_react_.useMemo)(()=>(null == taskPlan ? void 0 : taskPlan.length) ?? 0, [
        taskPlan
    ]);
    const currentIndex = (0, external_react_.useMemo)(()=>{
        const workingStepIndex = null == taskPlan ? void 0 : taskPlan.findLastIndex((item)=>item.status === types_TaskStatus.Running);
        if (-1 !== workingStepIndex) return workingStepIndex;
        const completedStepIndex = null == taskPlan ? void 0 : taskPlan.findLastIndex((item)=>item.status === types_TaskStatus.Success);
        if (-1 !== completedStepIndex) return completedStepIndex;
        return 0;
    }, [
        taskPlan
    ]);
    const iconMap = (0, external_react_.useMemo)(()=>({
            [types_TaskStatus.Success]: /*#__PURE__*/ (0, jsx_runtime_.jsx)(CheckOutlined, {
                style: ICON_STYLES.success
            }),
            [types_TaskStatus.Running]: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_Loading, {})
        }), []);
    const iconRender = (index)=>{
        const task = null == taskPlan ? void 0 : taskPlan[index];
        const status = null == task ? void 0 : task.status;
        return iconMap[status] || /*#__PURE__*/ (0, jsx_runtime_.jsx)(NumberCircle, {
            number: index + 1
        });
    };
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "h-[54px] relative z-50",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
            className: `flex absolute bottom-0 left-0 right-0 border border-black/8 bg-[#fff] rounded-[16px] sm:rounded-[12px] gap-5 ${isExpanded ? 'flex-col p-5 shadow-[0px_0px_1px_0px_rgba(0,_0,_0,_0.05),_0px_8px_32px_0px_rgba(0,_0,_0,_0.04)]' : 'flex-row items-start justify-between py-4 px-5 clickable shadow-none'}`,
            children: [
                /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                    className: "flex justify-between w-full",
                    children: [
                        !isExpanded && (null == taskPlan ? void 0 : taskPlan.length) ? /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                            className: "flex items-center gap-2.5 w-full pr-5",
                            children: [
                                iconRender(currentIndex),
                                /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                    className: "text-sm line-clamp-1",
                                    children: null == taskPlan ? void 0 : null == (_taskPlan_at = taskPlan.at(currentIndex)) ? void 0 : _taskPlan_at.title
                                })
                            ]
                        }) : /*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
                            className: "text-[#34322d] font-bold",
                            children: t('workspace.task.progress')
                        }),
                        !!(null == taskPlan ? void 0 : taskPlan.length) && /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                            className: "flex items-center gap-3",
                            children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)("button", {
                                className: "flex h-full cursor-pointer items-center justify-center gap-2 hover:opacity-80 flex-shrink-0 text-[#000]",
                                onClick: ()=>setIsExpanded((pre)=>!pre),
                                children: [
                                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
                                        className: "text-xs hidden sm:flex",
                                        children: `${currentIndex + 1} / ${totalSteps}`
                                    }),
                                    isExpanded ? /*#__PURE__*/ (0, jsx_runtime_.jsx)(DownOutlined, {
                                        style: {
                                            fontSize: '12px'
                                        }
                                    }) : /*#__PURE__*/ (0, jsx_runtime_.jsx)(UpOutlined, {
                                        style: {
                                            fontSize: '12px'
                                        }
                                    })
                                ]
                            })
                        })
                    ]
                }),
                isExpanded && /*#__PURE__*/ (0, jsx_runtime_.jsx)(jsx_runtime_.Fragment, {
                    children: null == taskPlan ? void 0 : taskPlan.map((item, index)=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                            className: "flex items-center gap-2.5 w-full",
                            children: [
                                iconRender(index),
                                /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                    className: "text-sm truncate",
                                    children: item.title
                                })
                            ]
                        }, index))
                })
            ]
        })
    });
};
const TaskProgress = TaskProgress_TaskProgress;
import zoom_out_namespaceObject from "./static/image/zoom-out.png";
import workspace_not_active_namespaceObject from "./static/svg/workspace-not-active.svg";
const isPhoneHIL = (message)=>{
    var _message_detail, _message_detail1, _message_detail_interrupt_data, _message_detail2;
    return 'message_notify_user' === message.type && (null == (_message_detail = message.detail) ? void 0 : _message_detail.scene) === 'phone' && (null == (_message_detail1 = message.detail) ? void 0 : _message_detail1.intent_type) === 'asking_user' || 'user_input' === message.type && (null == (_message_detail2 = message.detail) ? void 0 : null == (_message_detail_interrupt_data = _message_detail2.interrupt_data) ? void 0 : _message_detail_interrupt_data.suggested_user_action) === 'take_over_phone';
};
const isBrowserHIL = (message)=>{
    var _message_detail_interrupt_data, _message_detail, _message_detail_interrupt_data1, _message_detail1, _message_detail_interrupt_data_intervention_info, _message_detail_interrupt_data2, _message_detail2;
    return ((null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_interrupt_data = _message_detail.interrupt_data) ? void 0 : _message_detail_interrupt_data.type) === 'take_over_browser' || (null == (_message_detail1 = message.detail) ? void 0 : null == (_message_detail_interrupt_data1 = _message_detail1.interrupt_data) ? void 0 : _message_detail_interrupt_data1.suggested_user_action) === 'take_over_browser') && (null == (_message_detail2 = message.detail) ? void 0 : null == (_message_detail_interrupt_data2 = _message_detail2.interrupt_data) ? void 0 : null == (_message_detail_interrupt_data_intervention_info = _message_detail_interrupt_data2.intervention_info) ? void 0 : _message_detail_interrupt_data_intervention_info.intervention_url);
};
const useHumanInTheLoop = (message)=>{
    var _message_detail_options, _message_detail;
    const { sessionInfo } = agent();
    const sessionActive = 'ARCHIVED' !== sessionInfo.status;
    const userInputable = sessionActive && message.isLast;
    const isTakeOverBrowserMessage = isBrowserHIL(message);
    const showTakeOverBrowser = isTakeOverBrowserMessage && message.isLast;
    const isTakeOverPhoneMessage = isPhoneHIL(message);
    const showTakeOverPhone = isTakeOverPhoneMessage && message.isLast;
    const isOptionMessage = (null == message ? void 0 : null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_options = _message_detail.options) ? void 0 : _message_detail_options.length) > 0;
    const showOptionContainer = !isTakeOverBrowserMessage && !isTakeOverPhoneMessage && isOptionMessage;
    return {
        showTakeOverBrowser,
        showTakeOverPhone,
        showOptionContainer,
        userInputable
    };
};
const common_useHumanInTheLoop = useHumanInTheLoop;
const useTakeOverPhone = (isRealTime)=>{
    const { pipelineMessages, sessionInfo, chunks } = agent();
    const innerMessage = (0, external_react_.useMemo)(()=>chunks.findLast((item)=>{
            var _m_detail, _m_detail1, _m_detail2, _m_detail3, _m_detail4;
            const m = item;
            return 'inner_message' === m.role && (null == (_m_detail = m.detail) ? void 0 : _m_detail.access_key) && (null == (_m_detail1 = m.detail) ? void 0 : _m_detail1.access_secret_key) && (null == (_m_detail2 = m.detail) ? void 0 : _m_detail2.instance_no) && (null == (_m_detail3 = m.detail) ? void 0 : _m_detail3.user_id) && dayjs(null == (_m_detail4 = m.detail) ? void 0 : _m_detail4.expire_time).isAfter(dayjs());
        }), [
        chunks
    ]);
    const needTakeOverPhone = (0, external_react_.useMemo)(()=>{
        if ((null == sessionInfo ? void 0 : sessionInfo.status) === 'ARCHIVED') return false;
        if (!innerMessage) return false;
        const lastMessage = pipelineMessages[pipelineMessages.length - 1];
        if ((null == lastMessage ? void 0 : lastMessage.role) === 'assistant') {
            const userInputMessage = lastMessage.messages.find((item)=>isPhoneHIL(item));
            if (userInputMessage && isRealTime) return true;
        }
        return false;
    }, [
        null == sessionInfo ? void 0 : sessionInfo.status,
        innerMessage,
        pipelineMessages,
        isRealTime
    ]);
    return {
        needTakeOverPhone,
        innerMessage
    };
};
const Workspace_useTakeOverPhone = useTakeOverPhone;
const Workspace = ()=>{
    var _renderMessage_detail, _renderMessage_type_split_map, _renderMessage_type_split, _renderMessage_type_split1, _renderMessage_type;
    const { t } = useTranslation_useTranslation();
    const { Title } = Typography;
    const { workspaceVisible, setWorkspaceVisible, workspaceMessages, pipelineTargetMessage } = agent();
    const [renderMessage, setRenderMessage] = (0, external_react_.useState)();
    const [isRealTime, setIsRealTime] = (0, external_react_.useState)(false);
    const { needTakeOverPhone, innerMessage } = Workspace_useTakeOverPhone(isRealTime);
    const workspaceRenderer = (message)=>{
        var _message_detail, _message_detail1;
        if (needTakeOverPhone) {
            var _innerMessage_detail, _innerMessage_detail1, _innerMessage_detail2, _innerMessage_detail3;
            return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "w-full h-full flex justify-center items-center",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(CloudPhone, {
                    needHumanIntervention: true,
                    accessKey: null == innerMessage ? void 0 : null == (_innerMessage_detail = innerMessage.detail) ? void 0 : _innerMessage_detail.access_key,
                    accessSecretKey: null == innerMessage ? void 0 : null == (_innerMessage_detail1 = innerMessage.detail) ? void 0 : _innerMessage_detail1.access_secret_key,
                    instanceNo: null == innerMessage ? void 0 : null == (_innerMessage_detail2 = innerMessage.detail) ? void 0 : _innerMessage_detail2.instance_no,
                    userId: null == innerMessage ? void 0 : null == (_innerMessage_detail3 = innerMessage.detail) ? void 0 : _innerMessage_detail3.user_id
                })
            });
        }
        if (!message) return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
            className: "w-full h-full flex justify-center items-center",
            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
                src: workspace_not_active_namespaceObject,
                alt: "not-active"
            })
        });
        const Detail = registry.getDetailRenderer(null == message ? void 0 : message.type);
        if (null == message ? void 0 : message.type.startsWith('browser')) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Detail, {
            message: message,
            isRealTime: isRealTime
        }, "detail");
        if ((null == message ? void 0 : null == (_message_detail = message.detail) ? void 0 : _message_detail.status) === 'running' || (null == message ? void 0 : null == (_message_detail1 = message.detail) ? void 0 : _message_detail1.status) === 'pending') {
            if ((null == message ? void 0 : message.type) === 'web_search') return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "w-full h-full items-center p-4 overflow-auto",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(List, {
                    className: "w-full",
                    itemLayout: "vertical",
                    size: "large",
                    dataSource: Array.from({
                        length: 10
                    }, (_, index)=>index),
                    renderItem: ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(Skeleton, {
                            active: true,
                            className: "mb-6"
                        }),
                    split: true,
                    rowKey: (item)=>`${item}`
                })
            });
            return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "w-full h-full flex justify-center items-center",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Spin, {
                    spinning: true
                })
            });
        }
        return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Detail, {
            message: message,
            isRealTime: isRealTime
        }, "detail");
    };
    const handleWorkspaceClose = ()=>{
        setWorkspaceVisible(false);
    };
    const getMessageTypeIcon = (type)=>{
        if (!type) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconEmpty, {});
        const Icon = registry.getToolIcon(type);
        return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Icon, {});
    };
    (0, external_react_.useEffect)(()=>{
        var _registry_getMessageType;
        const targetMessage = pipelineTargetMessage && pipelineTargetMessage.id ? workspaceMessages.find((message)=>message.id === pipelineTargetMessage.id) : workspaceMessages.at(-1);
        setRenderMessage(targetMessage);
        if ((null == pipelineTargetMessage ? void 0 : pipelineTargetMessage.type) && !!(null == (_registry_getMessageType = registry.getMessageType(null == pipelineTargetMessage ? void 0 : pipelineTargetMessage.type)) ? void 0 : _registry_getMessageType.detailRenderer)) setWorkspaceVisible(true);
    }, [
        workspaceMessages,
        pipelineTargetMessage,
        renderMessage,
        setWorkspaceVisible
    ]);
    const renderTitle = ()=>{
        if (!renderMessage) return null;
        return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
            className: "rounded-3xl border flex items-center gap-2 px-3 py-2 border-[#e9e9e9] bg-[#f0f0f0] w-fit  max-w-full",
            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_MessageBrief, {
                message: renderMessage,
                withIcon: false
            })
        });
    };
    return workspaceVisible && /*#__PURE__*/ (0, jsx_runtime_.jsx)(Flex, {
        vertical: true,
        className: "min-w-[45%] max-w-[45%] h-full !py-5 !pl-0 !pr-5 !bg-white",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
            vertical: true,
            className: "w-full h-full !px-6 !pt-3 !pb-6 !bg-[#F9F9F9] rounded-3xl",
            children: [
                /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
                    justify: "space-between",
                    className: "h-[52px] [&_.ant-btn-icon-only]:!w-[40px]",
                    align: "center",
                    children: [
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(Title, {
                            level: 4,
                            className: "!mb-0",
                            children: t('workspace')
                        }),
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                            type: "text",
                            icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
                                src: zoom_out_namespaceObject
                            }),
                            onClick: handleWorkspaceClose,
                            style: {
                                fontSize: 20
                            }
                        })
                    ]
                }),
                /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
                    vertical: true,
                    className: "h-full overflow-hidden",
                    gap: 20,
                    children: [
                        /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
                            align: "center",
                            gap: "middle",
                            children: [
                                /*#__PURE__*/ (0, jsx_runtime_.jsx)(Flex, {
                                    className: "border-[#E1E1E1] border-1 border-solid w-[52px] h-[52px] rounded-md bg-[linear-gradient(180deg,_#FCFCFC_0%,_#EDEDED_100%)] text-[28px]",
                                    align: "center",
                                    justify: "center",
                                    children: getMessageTypeIcon(null == renderMessage ? void 0 : renderMessage.type)
                                }),
                                /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                    className: "text-sm flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap",
                                    children: renderTitle()
                                })
                            ]
                        }),
                        /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                            className: "flex-1 flex flex-col h-full border border-[#EDEDED] rounded-xl overflow-hidden bg-white shadow-[0px_2px_12px_0px_rgba(0,_0,_0,_0.04)]",
                            children: [
                                /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                    className: "h-[44px] flex justify-center items-center py-3 px-0 border-b-1 border-[#EDEDED] text-[16px] overflow-hidden overflow-ellipsis whitespace-nowrap max-w-full",
                                    children: (null == renderMessage ? void 0 : null == (_renderMessage_detail = renderMessage.detail) ? void 0 : _renderMessage_detail.action) || (null == renderMessage ? void 0 : null == (_renderMessage_type = renderMessage.type) ? void 0 : null == (_renderMessage_type_split1 = _renderMessage_type.split) ? void 0 : null == (_renderMessage_type_split = _renderMessage_type_split1.call(_renderMessage_type, '_')) ? void 0 : null == (_renderMessage_type_split_map = _renderMessage_type_split.map((word)=>{
                                        var _word_charAt;
                                        return (null == word ? void 0 : null == (_word_charAt = word.charAt(0)) ? void 0 : _word_charAt.toUpperCase()) + (null == word ? void 0 : word.slice(1));
                                    })) ? void 0 : _renderMessage_type_split_map.join(' ')) || 'Tool'
                                }),
                                /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                    className: "flex-1 overflow-hidden",
                                    children: workspaceRenderer(renderMessage)
                                }),
                                /*#__PURE__*/ (0, jsx_runtime_.jsx)(Flex, {
                                    className: "border-t-1 border-[#EDEDED] shadow-[0px_-2px_8px_0px_rgba(0,0,0,0.04)]",
                                    children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Controller, {
                                        onRealTimeChange: setIsRealTime
                                    })
                                })
                            ]
                        }),
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(TaskProgress, {})
                    ]
                })
            ]
        })
    });
};
const Agent_Workspace = Workspace;
const FileViewer_FileViewer = ()=>{
    const { fileViewerFile, setFileViewerFile } = agent();
    const fileViewerRenderer = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_FileReader, {
            url: fileViewerFile.url,
            contentType: fileViewerFile.content_type || fileViewerFile.type,
            filename: (null == fileViewerFile ? void 0 : fileViewerFile.filename) || (null == fileViewerFile ? void 0 : fileViewerFile.name)
        }, fileViewerFile.url);
    const handleFileViewerClose = ()=>{
        setFileViewerFile(void 0);
    };
    const renderTitle = ()=>(null == fileViewerFile ? void 0 : fileViewerFile.filename) || (null == fileViewerFile ? void 0 : fileViewerFile.name);
    const handleDownloadFile = async ()=>{
        const url = fileViewerFile.url;
        const filename = (null == fileViewerFile ? void 0 : fileViewerFile.filename) || (null == fileViewerFile ? void 0 : fileViewerFile.name);
        const contentType = fileViewerFile.content_type || fileViewerFile.type;
        const isImage = contentType && contentType.startsWith('image/');
        if (isImage) try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Failed to download the image:', error);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
        }
        else {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
        }
    };
    if (!fileViewerFile) return null;
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "min-w-[45%] max-w-[45%] flex flex-col h-full bg-white border-l border-[#e9e9e9]",
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "p-4 gap-4 flex items-center justify-between flex-shrink-0 border-b border-[#e9e9e9]",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: "flex-1",
                        children: renderTitle()
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                        type: "text",
                        icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(DownloadOutlined, {}),
                        onClick: handleDownloadFile
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(external_antd_Button, {
                        type: "text",
                        icon: /*#__PURE__*/ (0, jsx_runtime_.jsx)(CloseOutlined, {}),
                        onClick: handleFileViewerClose
                    })
                ]
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "flex-1 overflow-auto p-5",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                    className: "w-full h-full overflow-hidden",
                    children: fileViewerRenderer()
                })
            })
        ]
    });
};
const FileViewer = FileViewer_FileViewer;
const Agent = ({ shareButtonNode })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(Layout, {
        className: "h-screen w-full",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)(Flex, {
            className: "h-full",
            children: [
                /*#__PURE__*/ (0, jsx_runtime_.jsx)(Chatbot, {
                    shareButtonNode: shareButtonNode
                }),
                /*#__PURE__*/ (0, jsx_runtime_.jsx)(Agent_Workspace, {}),
                /*#__PURE__*/ (0, jsx_runtime_.jsx)(FileViewer, {})
            ]
        })
    });
const components_Agent = Agent;
const WelcomeContainer = ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "flex",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Welcome, {
            variant: "borderless",
            icon: "https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp",
            title: "Welcome to LangCrew",
            description: "Provide the agent with a mission.",
            styles: {
                title: {
                    fontSize: '48px',
                    fontWeight: 'bold'
                },
                description: {
                    fontSize: '26px',
                    textAlign: 'center'
                }
            }
        })
    });
const Chatbot_Welcome = WelcomeContainer;
import bg_namespaceObject from "./static/image/bg.png";
const Home = ({ senderVisible = true, headerNode, footerNode })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "h-full w-full py-14 bg-top bg-no-repeat bg-[size:100%] overflow-auto",
        style: {
            backgroundImage: `url(${bg_namespaceObject})`
        },
        children: /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
            className: `max-w-[1112px] mx-auto h-full w-full flex flex-col items-center gap-[60px] ${headerNode ? 'justify-start' : 'justify-center'}`,
            children: [
                headerNode ? headerNode : /*#__PURE__*/ (0, jsx_runtime_.jsx)(Chatbot_Welcome, {}),
                senderVisible && /*#__PURE__*/ (0, jsx_runtime_.jsx)(Chatbot_Sender, {}),
                footerNode ? footerNode : null
            ]
        })
    });
const components_Home = Home;
const TextBriefRenderer = ({ message })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
        content: message.content
    });
const text_TextBriefRenderer = TextBriefRenderer;
registry.registerMessageType({
    type: 'text',
    briefRenderer: text_TextBriefRenderer
});
const LiveStatusBriefRenderer = ({ message })=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "flex gap-2 items-center",
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_Loading, {}),
            " ",
            message.content
        ]
    });
const live_status_TextBriefRenderer = LiveStatusBriefRenderer;
registry.registerMessageType({
    type: 'live_status',
    briefRenderer: live_status_TextBriefRenderer
});
const Planner = (props)=>{
    const { data } = props;
    const { Paragraph } = Typography;
    const { setPipelineTargetMessage, sessionInfo } = agent();
    null == sessionInfo || sessionInfo.status;
    const [expandedKeys, setExpandedKeys] = (0, external_react_.useState)([]);
    const prevDataLengthRef = (0, external_react_.useRef)(0);
    const getStepIcon = (status)=>{
        switch(status){
            case types_TaskStatus.Running:
                return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_Loading, {});
            case types_TaskStatus.Success:
                return /*#__PURE__*/ (0, jsx_runtime_.jsx)(CheckOutlined, {});
            case types_TaskStatus.Error:
                return /*#__PURE__*/ (0, jsx_runtime_.jsx)(WarningOutlined, {});
            default:
                return;
        }
    };
    const getStepStatus = (status)=>{
        if (status === types_TaskStatus.Running) return types_TaskStatus.Pending;
        return null;
    };
    const renderContent = (item, idx)=>{
        if (registry.getBriefRenderer(item.type)) {
            if (isToolMessage(item)) {
                var _item_detail;
                return /*#__PURE__*/ (0, jsx_runtime_.jsxs)(external_react_.Fragment, {
                    children: [
                        item.content && /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
                            content: item.content,
                            className: "text-sm text-gray-500"
                        }),
                        /*#__PURE__*/ (0, jsx_runtime_.jsx)(ClickableTool, {
                            onClick: ()=>setPipelineTargetMessage(item),
                            active: (null == (_item_detail = item.detail) ? void 0 : _item_detail.status) === 'pending',
                            children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_MessageBrief, {
                                message: item
                            })
                        })
                    ]
                }, idx);
            }
            return /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_MessageBrief, {
                message: item
            }, idx);
        }
        return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Paragraph, {
            children: item.content
        });
    };
    const items = data.map((step)=>{
        var _step_children;
        return {
            key: step.id,
            title: step.title,
            status: getStepStatus(step.status),
            icon: getStepIcon(step.status),
            description: step.description,
            ...(null == step ? void 0 : null == (_step_children = step.children) ? void 0 : _step_children.length) && {
                content: /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                    className: "flex flex-col gap-4 pl-2",
                    children: step.children.map((item, idx)=>/*#__PURE__*/ (0, jsx_runtime_.jsxs)(external_react_.Fragment, {
                            children: [
                                renderContent(item, idx),
                                /*#__PURE__*/ (0, jsx_runtime_.jsx)(MessageAttachments, {
                                    message: item
                                })
                            ]
                        }, idx))
                })
            }
        };
    });
    (0, external_react_.useEffect)(()=>{
        const currentDataLength = data.length;
        const prevDataLength = prevDataLengthRef.current;
        if (0 === prevDataLength) setExpandedKeys(data.map((item)=>item.id));
        else if (currentDataLength > prevDataLength) {
            const newSteps = data.slice(prevDataLength);
            const newStepIds = newSteps.map((item)=>item.id);
            setExpandedKeys((prev)=>[
                    ...prev,
                    ...newStepIds
                ]);
        }
        prevDataLengthRef.current = currentDataLength;
    }, [
        data
    ]);
    const onExpand = (keys)=>{
        setExpandedKeys(keys);
    };
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Card, {
        className: "w-full planner !border-none [&_.ant-card-body]:!p-0",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(ThoughtChain, {
            items: items,
            collapsible: {
                expandedKeys: expandedKeys,
                onExpand
            }
        })
    });
};
const Chatbot_Planner = Planner;
const PlanBriefRenderer = ({ message })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(Chatbot_Planner, {
        data: message.children
    });
const plan_PlanBriefRenderer = PlanBriefRenderer;
registry.registerMessageType({
    type: 'plan',
    briefRenderer: plan_PlanBriefRenderer
});
const ErrorBriefRenderer = ({ message })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)(Alert, {
        message: message.content || "\u53D1\u751F\u4E86\u4E00\u4E2A\u9519\u8BEF",
        type: "error",
        style: {
            marginBottom: 8
        }
    });
const error_ErrorBriefRenderer = ErrorBriefRenderer;
registry.registerMessageType({
    type: 'error',
    briefRenderer: error_ErrorBriefRenderer
});
const WebSearchDetailRenderer_WebSearchDetailRenderer = ({ message })=>{
    const { content } = common_useToolContent(message);
    const data = isJsonString(content) ? JSON.parse(content) : [];
    const list = data.map((item)=>({
            link: item.metadata.url,
            title: item.title,
            description: item.metadata.snippet,
            icon: item.metadata.favicon
        }));
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_Search, {
        data: list
    });
};
const WebSearchDetailRenderer = WebSearchDetailRenderer_WebSearchDetailRenderer;
registry.registerMessageType({
    type: 'web_search',
    detailRenderer: WebSearchDetailRenderer,
    icon: ToolIconSearch
});
const TerminalDetailRenderer = ({ message })=>{
    const { content } = common_useToolContent(message);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Infra_Terminal, {
            content: content
        })
    });
};
const RunCommandDetailRenderer = TerminalDetailRenderer;
registry.registerMessageType({
    type: 'run_command',
    detailRenderer: RunCommandDetailRenderer,
    icon: ToolIconCode
});
const DeleteFileDetailRenderer = ({ message })=>{
    var _message_detail_param, _message_detail, _message_detail_param1, _message_detail1;
    const { content, contentType } = common_useToolContent(message);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(FileContentRender, {
        fileContent: content || (null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_param = _message_detail.param) ? void 0 : _message_detail_param.content),
        fileExtension: getFileExtension(null == (_message_detail1 = message.detail) ? void 0 : null == (_message_detail_param1 = _message_detail1.param) ? void 0 : _message_detail_param1.path),
        contentType: contentType
    });
};
const delete_file_DeleteFileDetailRenderer = DeleteFileDetailRenderer;
registry.registerMessageType({
    type: 'delete_file',
    detailRenderer: delete_file_DeleteFileDetailRenderer,
    icon: ToolIconFile
});
const ServiceDeployDetailRenderer_ServiceDeployDetailRenderer = ({ message })=>{
    const { content } = common_useToolContent(message);
    const data = isJsonString(content) ? JSON.parse(content) : {};
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full p-4",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("iframe", {
            src: data.domain_url,
            className: "w-full h-full"
        })
    });
};
const ServiceDeployDetailRenderer = ServiceDeployDetailRenderer_ServiceDeployDetailRenderer;
registry.registerMessageType({
    type: 'service_deploy',
    detailRenderer: ServiceDeployDetailRenderer,
    icon: ToolIconCode
});
const CodeInterpreterDetailRenderer = ({ message })=>{
    var _message_detail_param, _message_detail, _message_detail_param1, _message_detail1, _message_detail_result, _message_detail2;
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "w-full h-full flex flex-col",
        style: {
            height: '70%'
        },
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "w-full h-[70%] bg-gray-50 rounded-t-lg border border-gray-200",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Code, {
                    language: (null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_param = _message_detail.param) ? void 0 : _message_detail_param.language) || 'python',
                    code: null == (_message_detail1 = message.detail) ? void 0 : null == (_message_detail_param1 = _message_detail1.param) ? void 0 : _message_detail_param1.code,
                    isDiff: false
                })
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "w-full h-[30%] bg-white rounded-b-lg border border-gray-200 border-t-0",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                        className: "flex items-center px-1.5",
                        children: [
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                className: "w-2 h-2 bg-green-500 rounded-full mr-2"
                            }),
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
                                className: "text-sm font-medium text-gray-700",
                                children: useTranslation_getTranslation('code.interpreter.execution.result')
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Code, {
                        language: "plaintext",
                        code: (null == (_message_detail2 = message.detail) ? void 0 : null == (_message_detail_result = _message_detail2.result) ? void 0 : _message_detail_result.content) || useTranslation_getTranslation('code.interpreter.execution.result.placeholder'),
                        isDiff: false
                    })
                ]
            })
        ]
    });
};
const code_interpreter_CodeInterpreterDetailRenderer = CodeInterpreterDetailRenderer;
registry.registerMessageType({
    type: 'code_interpreter',
    detailRenderer: code_interpreter_CodeInterpreterDetailRenderer,
    icon: ToolIconCode
});
const PhoneHIL = ({ userInputable = true })=>{
    const { t } = useTranslation_useTranslation();
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)(jsx_runtime_.Fragment, {
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "flex justify-between items-center bg-[#FFEDC9] rounded-2xl px-3 py-1.5 text-[#FF8800]",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                        className: "flex flex-row items-center gap-1",
                        children: [
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconCircle, {}),
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                className: "text-[14px]",
                                children: t('task.phone.continue.text1')
                            }),
                            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                                className: "flex items-center bg-white rounded-[11px] px-2 py-1 gap-0.5",
                                children: [
                                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconPhone, {
                                        className: "text-[#456CFF] text-[14px]"
                                    }),
                                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                        className: "text-[#999999] text-[12px] leading-[12px]",
                                        children: t('task.phone.continue.title')
                                    })
                                ]
                            }),
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                children: t('task.phone.continue.text2')
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconArrow, {})
                    })
                ]
            }),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "flex flex-row items-center justify-between gap-1 rounded-[12px] border-[#EDEDED] border-[1px] p-2 pl-4",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                        className: "flex flex-row items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconPhone2, {
                                className: "text-[28px]"
                            }),
                            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                                className: "flex items-center gap-1",
                                children: [
                                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                        children: t('task.phone.continue.text3')
                                    }),
                                    /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                                        className: "flex items-center bg-white rounded-[14px] p-1.5 gap-0.5 border-[#EAEAEA] border-[1px]",
                                        children: [
                                            /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconPhone, {
                                                className: "text-[#456CFF] text-[16px]"
                                            }),
                                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                                className: "text-black text-[14px] leading-[16px]",
                                                children: t('task.phone.continue.title')
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                        children: t('task.phone.continue.text4')
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: `px-6 py-2 rounded-md text-[14px] w-fit text-white whitespace-nowrap ${userInputable ? 'bg-black cursor-pointer' : 'bg-gray-700 cursor-not-allowed'}
        `,
                        onClick: ()=>{
                            if (userInputable) utils_eventBus.emit('user_input_click', t('task.user_input.continue.button'));
                        },
                        children: t('task.user_input.continue.button')
                    })
                ]
            })
        ]
    });
};
const common_PhoneHIL = PhoneHIL;
const UserInputBriefRenderer_UserInputBriefRenderer = ({ message })=>{
    const { t } = useTranslation_useTranslation();
    const userInputMessage = message;
    const { showTakeOverBrowser, showTakeOverPhone, showOptionContainer, userInputable } = common_useHumanInTheLoop(userInputMessage);
    const handleClick = (option)=>{
        if (userInputable) utils_eventBus.emit('user_input_click', option);
    };
    const renderUserInput = ()=>{
        if (showTakeOverBrowser) {
            var _userInputMessage_detail_interrupt_data_intervention_info, _userInputMessage_detail_interrupt_data, _userInputMessage_detail;
            return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "flex gap-2 items-center justify-between p-2 pl-4 rounded-xl border border-[#ededed]",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
                        content: userInputMessage.content
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: "flex items-center gap-2",
                        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("a", {
                            href: null == (_userInputMessage_detail = userInputMessage.detail) ? void 0 : null == (_userInputMessage_detail_interrupt_data = _userInputMessage_detail.interrupt_data) ? void 0 : null == (_userInputMessage_detail_interrupt_data_intervention_info = _userInputMessage_detail_interrupt_data.intervention_info) ? void 0 : _userInputMessage_detail_interrupt_data_intervention_info.intervention_url,
                            target: "_blank",
                            rel: "noreferrer",
                            onClick: (e)=>{
                                if (!userInputable) return void e.preventDefault();
                            },
                            className: `px-6 py-2 rounded-md text-[14px] w-fit text-white whitespace-nowrap ${userInputable ? 'bg-black cursor-pointer' : 'bg-gray-700 cursor-not-allowed'}`,
                            children: t('task.user_input.take_over_browser.button')
                        })
                    })
                ]
            });
        }
        if (showTakeOverPhone) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_PhoneHIL, {
            userInputable: userInputable
        });
        if (showOptionContainer) {
            var _userInputMessage_detail_options, _userInputMessage_detail1;
            return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "flex gap-2 items-center justify-between p-2 pl-4 rounded-xl border border-[#ededed]",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
                        content: userInputMessage.content
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: "flex items-center gap-2",
                        children: null == userInputMessage ? void 0 : null == (_userInputMessage_detail1 = userInputMessage.detail) ? void 0 : null == (_userInputMessage_detail_options = _userInputMessage_detail1.options) ? void 0 : _userInputMessage_detail_options.map((option)=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                className: `px-6 py-2 rounded-md text-[14px] w-fit text-white whitespace-nowrap ${userInputable ? 'bg-black cursor-pointer' : 'bg-gray-700 cursor-not-allowed'}
                  `,
                                onClick: ()=>{
                                    handleClick(option);
                                },
                                children: option
                            }, option))
                    })
                ]
            });
        }
        return /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
            content: message.content
        });
    };
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)(jsx_runtime_.Fragment, {
        children: [
            renderUserInput(),
            /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "py-1.5 px-3 rounded-2xl flex items-center gap-1 bg-[#FFEDC9] text-[14px] w-fit text-[#E07801]",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconCircle, {}),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        children: t('user.input.brief')
                    })
                ]
            })
        ]
    });
};
const UserInputBriefRenderer = UserInputBriefRenderer_UserInputBriefRenderer;
registry.registerMessageType({
    type: 'user_input',
    briefRenderer: UserInputBriefRenderer
});
const FinishReasonBriefRenderer_FinishReasonBriefRenderer = ({ hasUserInput, message })=>{
    const { t } = useTranslation_useTranslation();
    const { detail } = message;
    if ((null == detail ? void 0 : detail.status) === 'user_input') return null;
    if (hasUserInput) return null;
    const bgColor = {
        completed: '#D5FFD2',
        cancelled: '#D5FFD2',
        failed: '#FFEDC9',
        abnormal: '#FFEDC9'
    }[(null == detail ? void 0 : detail.status) || 'completed'];
    const textColor = {
        completed: '#00A108',
        cancelled: '#00A108',
        failed: '#FF8800',
        abnormal: '#FF8800'
    }[(null == detail ? void 0 : detail.status) || 'completed'];
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "rounded-[14px] w-fit px-3 py-1 flex items-center gap-1",
        style: {
            backgroundColor: bgColor,
            color: textColor
        },
        children: [
            ((null == detail ? void 0 : detail.status) === 'completed' || (null == detail ? void 0 : detail.status) === 'cancelled') && /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconCheck, {}),
            ((null == detail ? void 0 : detail.status) === 'failed' || (null == detail ? void 0 : detail.status) === 'abnormal') && /*#__PURE__*/ (0, jsx_runtime_.jsx)(ToolIconTaskError, {}),
            t(`task.finish.reason.${(null == detail ? void 0 : detail.status) || 'completed'}`)
        ]
    });
};
const FinishReasonBriefRenderer = FinishReasonBriefRenderer_FinishReasonBriefRenderer;
registry.registerMessageType({
    type: 'finish_reason',
    briefRenderer: FinishReasonBriefRenderer
});
const FileParserDetailRenderer = ({ message })=>{
    const { content, contentType } = common_useToolContent(message);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(FileContentRender, {
        fileContent: content,
        fileExtension: "txt",
        contentType: contentType
    });
};
const file_parser_FileParserDetailRenderer = FileParserDetailRenderer;
registry.registerMessageType({
    type: 'file_parser',
    detailRenderer: file_parser_FileParserDetailRenderer,
    icon: ToolIconFile
});
const ImageParserDetailRenderer = ({ message })=>{
    var _message_detail_param, _message_detail;
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_ImageDetailRenderer, {
        imageUrl: null == message ? void 0 : null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_param = _message_detail.param) ? void 0 : _message_detail_param.image_url
    });
};
const image_parser_ImageParserDetailRenderer = ImageParserDetailRenderer;
registry.registerMessageType({
    type: 'image_parser',
    detailRenderer: image_parser_ImageParserDetailRenderer,
    icon: ToolIconImage
});
const ErrorDetailRenderer = ({ errorMessage })=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full flex justify-center items-center",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
            className: "text-red-500",
            children: errorMessage
        })
    });
const common_ErrorDetailRenderer = ErrorDetailRenderer;
const ImageGenerationDetailRenderer_ImageGenerationDetailRenderer = ({ message })=>{
    const { content } = common_useToolContent(message);
    const { image_url } = isJsonString(content) ? JSON.parse(content) : {};
    if (!image_url) return /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_ErrorDetailRenderer, {
        errorMessage: useTranslation_getTranslation('error.image.generation.failed')
    });
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_ImageDetailRenderer, {
        imageUrl: image_url
    });
};
const ImageGenerationDetailRenderer = ImageGenerationDetailRenderer_ImageGenerationDetailRenderer;
registry.registerMessageType({
    type: 'image_generation',
    detailRenderer: ImageGenerationDetailRenderer,
    icon: ToolIconImage
});
const MessageNotifyUserBriefRenderer = ({ message })=>{
    const { showTakeOverPhone, userInputable } = common_useHumanInTheLoop(message);
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)(jsx_runtime_.Fragment, {
        children: [
            /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
                content: message.content
            }),
            showTakeOverPhone && /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_PhoneHIL, {
                userInputable: userInputable
            })
        ]
    });
};
const message_notify_user_MessageNotifyUserBriefRenderer = MessageNotifyUserBriefRenderer;
registry.registerMessageType({
    type: 'message_notify_user',
    briefRenderer: message_notify_user_MessageNotifyUserBriefRenderer
});
const MySqlDetailRenderer_MySqlDetailRenderer = ({ message })=>{
    var _message_detail_param, _message_detail, _message_detail_param1, _message_detail1;
    const { content } = common_useToolContent(message);
    return /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
        className: "w-full h-full p-4 flex flex-col",
        children: [
            (null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_param = _message_detail.param) ? void 0 : _message_detail_param.query) && /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                className: "w-full flex-1 bg-gray-50 rounded-t-lg border border-gray-200",
                children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Code, {
                    language: "sql",
                    code: null == (_message_detail1 = message.detail) ? void 0 : null == (_message_detail_param1 = _message_detail1.param) ? void 0 : _message_detail_param1.query,
                    isDiff: false
                })
            }),
            content && /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                className: "w-full flex-2 bg-white flex flex-col",
                children: [
                    /*#__PURE__*/ (0, jsx_runtime_.jsxs)("div", {
                        className: "flex items-center px-1.5 ",
                        children: [
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                                className: "w-2 h-2 bg-green-500 rounded-full mr-2"
                            }),
                            /*#__PURE__*/ (0, jsx_runtime_.jsx)("span", {
                                className: "text-sm font-medium text-gray-700",
                                children: useTranslation_getTranslation('code.interpreter.execution.result')
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                        className: "flex-1",
                        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Code, {
                            language: "plaintext",
                            code: content,
                            isDiff: false
                        })
                    })
                ]
            })
        ]
    }, message.id);
};
const MySqlDetailRenderer = MySqlDetailRenderer_MySqlDetailRenderer;
registry.registerMessageType({
    type: [
        'execute_sql',
        'list_tables',
        'describe_table',
        'show_databases',
        'show_create_table',
        'show_index',
        'show_variables',
        'show_status',
        'mysql_query'
    ],
    detailRenderer: MySqlDetailRenderer,
    icon: ToolIconCode
});
const BrowserDetailRenderer = ({ message, isRealTime })=>{
    var _message_detail_param, _message_detail, _message_detail_result, _message_detail1, _message_detail2, _message_detail_result1, _message_detail3;
    const sandboxUrl = (null == message ? void 0 : null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_param = _message_detail.param) ? void 0 : _message_detail_param.sandbox_url) || (null == message ? void 0 : null == (_message_detail1 = message.detail) ? void 0 : null == (_message_detail_result = _message_detail1.result) ? void 0 : _message_detail_result.sandbox_url);
    const iframeElement = (0, external_react_.useMemo)(()=>{
        if (!agent.getState().shareId && sandboxUrl) return /*#__PURE__*/ (0, jsx_runtime_.jsx)("iframe", {
            src: sandboxUrl,
            className: "w-full h-full"
        }, sandboxUrl);
        return null;
    }, [
        sandboxUrl
    ]);
    const showSandbox = !agent.getState().shareId && isRealTime && sandboxUrl && !(null == message ? void 0 : message.isFinish);
    if (showSandbox) return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full",
        children: iframeElement
    });
    if ((null == message ? void 0 : null == (_message_detail2 = message.detail) ? void 0 : _message_detail2.status) === 'pending') return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full flex justify-center items-center",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Spin, {
            spinning: true
        })
    });
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(common_ImageDetailRenderer, {
        imageUrl: null == message ? void 0 : null == (_message_detail3 = message.detail) ? void 0 : null == (_message_detail_result1 = _message_detail3.result) ? void 0 : _message_detail_result1.image_url
    });
};
const browser_BrowserDetailRenderer = BrowserDetailRenderer;
registry.registerMessageType({
    type: /^browser/,
    detailRenderer: browser_BrowserDetailRenderer,
    icon: ToolIconBrowser
});
const PhoneDetailRenderer = ({ message, isRealTime })=>{
    var _data_current_state;
    const { content } = common_useToolContent(message);
    const data = isJsonString(content) ? JSON.parse(content) : {};
    const imageUrl = null == (_data_current_state = data.current_state) ? void 0 : _data_current_state.screenshot_url;
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full flex justify-center items-center",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(CloudPhone, {
            phoneRender: ()=>/*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
                    className: "w-full h-full flex justify-center items-center bg-black",
                    children: /*#__PURE__*/ (0, jsx_runtime_.jsx)("img", {
                        src: imageUrl,
                        className: "max-w-full max-h-full w-full h-full object-contain"
                    })
                })
        })
    });
};
const phone_PhoneDetailRenderer = PhoneDetailRenderer;
registry.registerMessageType({
    type: /^phone/,
    detailRenderer: phone_PhoneDetailRenderer,
    icon: ToolIconPhone
});
const MarkdownResultDetailRenderer = ({ message })=>{
    const { content, contentType } = common_useToolContent(message);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(FileContentRender, {
        fileContent: content,
        fileExtension: "md",
        contentType: contentType
    });
};
const markdown_result_MarkdownResultDetailRenderer = MarkdownResultDetailRenderer;
registry.registerMessageType({
    type: [
        'knowledge_search',
        'chunk_retrieval'
    ],
    detailRenderer: markdown_result_MarkdownResultDetailRenderer,
    icon: ToolIconSearch
});
const FileDiffDetailRenderer = ({ message })=>{
    var _message_detail_param, _message_detail;
    const { content, contentType } = common_useToolContent(message);
    const { old_file_content, new_file_content } = isJsonString(content) ? JSON.parse(content) : {};
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)(FileContentRender, {
        fileContent: new_file_content,
        oldFileContent: old_file_content,
        fileExtension: getFileExtension(null == (_message_detail = message.detail) ? void 0 : null == (_message_detail_param = _message_detail.param) ? void 0 : _message_detail_param.path),
        contentType: contentType
    });
};
const file_diff_FileDiffDetailRenderer = FileDiffDetailRenderer;
registry.registerMessageType({
    type: [
        'file_read_text',
        'file_append_text',
        'file_read_text',
        'file_replace_text',
        'read_file',
        'write_file'
    ],
    detailRenderer: file_diff_FileDiffDetailRenderer,
    icon: ToolIconFile
});
const MilvusDetailRenderer_MilvusDetailRenderer = ({ message })=>{
    devLog('message', message);
    const { t } = useTranslation_useTranslation();
    const { content } = common_useToolContent(message);
    const list = null == content ? void 0 : content.split('\n\n');
    devLog('list', list);
    const markdown = null == list ? void 0 : list.reduce((acc, cur)=>{
        if (isJsonString(cur)) {
            var _json_entity, _json_entity1, _json_entity2;
            const json = JSON.parse(cur);
            devLog('json', json);
            if (json.question && json.answer) acc += `## ${json.question}\n\n${json.answer}\n\n`;
            if (json.text_emb) acc += `${json.text_emb}\n\n`;
            if (null == (_json_entity = json.entity) ? void 0 : _json_entity.text_emb) acc += `${json.entity.text_emb}\n\n`;
            if ((null == (_json_entity1 = json.entity) ? void 0 : _json_entity1.product_name) && (null == (_json_entity2 = json.entity) ? void 0 : _json_entity2.product_info)) {
                var _json_entity3;
                const nameTitle = `# ${null == (_json_entity3 = json.entity) ? void 0 : _json_entity3.product_name}\n\n`;
                const info = json.entity.product_info.startsWith(nameTitle) ? json.entity.product_info.replace(nameTitle, '') : json.entity.product_info;
                acc += `${nameTitle}${info}\n\n`;
            }
            if (json.product_name && json.sex && json.age && json.info && isJsonString(json.info)) {
                const infoJson = JSON.parse(json.info);
                const infoMd = Object.entries(infoJson).map(([key, value])=>`- ${key}\u{FF1A}${value}`).join('\n\n');
                acc += `# ${json.product_name}\n\n`;
                acc += `${t('sex')}: ${json.sex}\n\n`;
                acc += `${t('age')}: ${json.age}\n\n`;
                acc += `${t('rateInfo')}: \n\n${infoMd}\n\n`;
            }
        }
        return acc;
    }, '');
    devLog('markdown', markdown);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: "w-full h-full overflow-y-auto p-2",
        children: /*#__PURE__*/ (0, jsx_runtime_.jsx)(Markdown, {
            content: markdown
        })
    });
};
const MilvusDetailRenderer = MilvusDetailRenderer_MilvusDetailRenderer;
registry.registerMessageType({
    type: [
        'milvus_qa_search',
        'milvus_hybrid_search',
        'milvus_product_search',
        'milvus_tariff_search'
    ],
    detailRenderer: MilvusDetailRenderer
});
const AgentX_AgentX = (props)=>{
    const [currentAgent, setCurrentAgent] = (0, external_react_.useState)(null);
    const { agentId, sessionId, shareId, sharePassword, basePath, backPath, headerNode, footerNode, shareButtonNode, knowledgeBases, mcpTools, sandboxTools, selectedTools, selectedKnowledgeBases, extraHeaders, requestPrefix, language, senderContent } = props;
    const { setBasePath, setBackPath, setAgentId, setSessionId, setShareId, setSharePassword, setMode, setSenderKnowledgeBases, setSenderMCPTools, setSenderSandboxTools, setSelectedSenderKnowledgeBases, setSelectedSenderMCPTools, setExtraHeaders, setRequestPrefix, setSenderContent } = agent();
    (0, external_react_.useEffect)(()=>{
        if (basePath !== agent.getState().basePath) setBasePath(basePath);
        if (backPath !== agent.getState().backPath) setBackPath(backPath);
        if (agentId !== agent.getState().agentId) setAgentId(agentId);
        if (sessionId !== agent.getState().sessionId) setSessionId(sessionId || null);
    }, [
        basePath,
        backPath,
        agentId,
        sessionId,
        setBasePath,
        setAgentId,
        setSessionId,
        setBackPath
    ]);
    (0, external_react_.useEffect)(()=>{
        if (shareId) {
            setShareId(shareId);
            setSharePassword(sharePassword);
            setMode(types_AgentMode.Replay);
        } else setMode(types_AgentMode.Chatbot);
        setSenderMCPTools(mcpTools || []);
        return ()=>{
            setShareId('');
            setSharePassword('');
            setMode(types_AgentMode.Chatbot);
        };
    }, []);
    (0, external_react_.useEffect)(()=>{
        setSenderKnowledgeBases(knowledgeBases || []);
        if (!sessionId && Array.isArray(selectedKnowledgeBases) && (null == knowledgeBases ? void 0 : knowledgeBases.length)) {
            const selectedItems = knowledgeBases.filter((item)=>selectedKnowledgeBases.includes(item.knowledge_id));
            setSelectedSenderKnowledgeBases(selectedItems);
        }
    }, [
        sessionId,
        selectedKnowledgeBases,
        knowledgeBases,
        setSenderKnowledgeBases,
        setSelectedSenderKnowledgeBases
    ]);
    (0, external_react_.useEffect)(()=>{
        setSenderMCPTools(mcpTools || []);
    }, [
        mcpTools,
        setSenderMCPTools
    ]);
    (0, external_react_.useEffect)(()=>{
        setSenderSandboxTools(sandboxTools || []);
        if (!sessionId && Array.isArray(selectedTools) && (null == sandboxTools ? void 0 : sandboxTools.length)) {
            const selectedItems = sandboxTools.filter((item)=>selectedTools.includes(item.agent_tool_id));
            setSelectedSenderMCPTools(selectedItems);
        }
    }, [
        sessionId,
        selectedTools,
        sandboxTools,
        setSenderSandboxTools,
        setSelectedSenderMCPTools
    ]);
    (0, external_react_.useEffect)(()=>{
        setExtraHeaders(extraHeaders || {});
        setRequestPrefix(requestPrefix || '');
    }, [
        extraHeaders,
        setExtraHeaders,
        requestPrefix,
        setRequestPrefix
    ]);
    (0, external_react_.useEffect)(()=>{
        if (language) changeLanguage(language);
    }, [
        language
    ]);
    (0, external_react_.useEffect)(()=>{
        if ('string' == typeof senderContent) setSenderContent(senderContent);
    }, [
        senderContent,
        setSenderContent
    ]);
    return /*#__PURE__*/ (0, jsx_runtime_.jsx)("div", {
        className: `w-full${headerNode ? '' : ' h-screen'}`,
        children: sessionId || shareId ? /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_Agent, {
            shareButtonNode: shareButtonNode
        }) : /*#__PURE__*/ (0, jsx_runtime_.jsx)(components_Home, {
            headerNode: headerNode,
            footerNode: footerNode
        })
    });
};
const AgentX = AgentX_AgentX;
export { AgentX as default };
