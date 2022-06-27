"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _fswatcher_abort_controller, _fswatcher, _workdir, _outdir, _compilation_queue;
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = __importDefault(require("child_process"));
const events_1 = __importDefault(require("events"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const nodtilus_1 = __importDefault(require("nodtilus"));
class WatchPile extends events_1.default {
    constructor() {
        super();
        _fswatcher_abort_controller.set(this, new AbortController());
        _fswatcher.set(this, null);
        _workdir.set(this, process.cwd());
        _outdir.set(this, path_1.default.join(process.cwd(), "./dist/"));
        _compilation_queue.set(this, new Array());
    }
    //
    addListener(eventName, listener) { return super.addListener(eventName, listener); }
    emit(eventName, ...args) { return super.emit(eventName, ...args); }
    listenerCount(eventName) { return super.listenerCount(eventName); }
    listeners(eventName) { return super.listeners(eventName); }
    off(eventName, listener) { return super.off(eventName, listener); }
    on(eventName, listener) { return super.on(eventName, listener); }
    once(eventName, listener) { return super.once(eventName, listener); }
    prependListener(eventName, listener) { return super.prependListener(eventName, listener); }
    prependOnceListener(eventName, listener) { return super.prependOnceListener(eventName, listener); }
    rawListeners(eventName) { return super.rawListeners(eventName); }
    removeAllListeners(event) { return super.removeAllListeners(event); }
    removeListener(eventName, listener) { return super.removeListener(eventName, listener); }
    //
    get workdir() { return __classPrivateFieldGet(this, _workdir); }
    get outdir() { return __classPrivateFieldGet(this, _outdir); }
    //
    start(workdir, outdir, options) {
        if (!__classPrivateFieldGet(this, _fswatcher)) {
            __classPrivateFieldSet(this, _workdir, workdir || this.workdir);
            __classPrivateFieldSet(this, _outdir, outdir || this.outdir);
            options.filter = options.filter || new RegExp("(.)+\\.ts$", "g");
            options.firstCompileAll = options.firstCompileAll == true ? true : false;
            // 
            __classPrivateFieldSet(this, _fswatcher, fs_1.default.watch(this.workdir, {
                recursive: true,
                encoding: "utf-8",
                persistent: true
            }));
            // 
            let compile = async (event_type, relative_filepath) => {
                let compilation_timestamp = Date.now();
                let filepath = path_1.default.join(this.workdir, relative_filepath);
                let out_filepath = path_1.default.join(this.outdir, path_1.default.dirname(relative_filepath), (path_1.default.basename(relative_filepath).substring(0, path_1.default.basename(relative_filepath).length - path_1.default.extname(path_1.default.basename(relative_filepath)).length)
                    + ".js"));
                if (!fs_1.default.existsSync(filepath)) {
                    if (fs_1.default.existsSync(out_filepath)) {
                        nodtilus_1.default.files.delete(out_filepath);
                        this.emit("compile", filepath, out_filepath, "moved_or_deleted");
                    }
                }
                else {
                    if (!fs_1.default.statSync(filepath).isDirectory()) {
                        nodtilus_1.default.files.mkdirs(path_1.default.dirname(out_filepath));
                        // 
                        let tmp_config_file = path_1.default.join(__dirname, "/tmp/", `/${compilation_timestamp}.json`);
                        nodtilus_1.default.files.mkdirs(path_1.default.dirname(tmp_config_file));
                        fs_1.default.copyFileSync(options.tsconfig, tmp_config_file);
                        let tmp_config = JSON.parse(fs_1.default.readFileSync(tmp_config_file).toString("utf-8").replace(/((\/\*(.)+\*\/)|(\/\/(.)+))/g, ""));
                        delete tmp_config.include;
                        delete tmp_config.compilerOptions.outDir;
                        delete tmp_config.compilerOptions.rootDir;
                        tmp_config.include = [filepath];
                        tmp_config.compilerOptions.outDir = path_1.default.dirname(out_filepath);
                        tmp_config.compilerOptions.rootDir = path_1.default.dirname(filepath);
                        fs_1.default.writeFileSync(tmp_config_file, JSON.stringify(tmp_config, null, 2));
                        // 
                        try {
                            let command = `tsc --project ${tmp_config_file}`;
                            let compile_process = child_process_1.default.exec(command);
                            compile_process.on("close", () => {
                                fs_1.default.unlinkSync(tmp_config_file);
                                this.emit("compile", filepath, out_filepath, event_type);
                            });
                        }
                        catch (e) {
                            console.error(e);
                            if (Object.keys(e).includes("stdout")) {
                                console.log(e.stdout.toString("utf-8"));
                            }
                        }
                    }
                }
            };
            // 
            if (options.firstCompileAll) {
                let compile_all = (p) => {
                    if (fs_1.default.existsSync(p)) {
                        if (fs_1.default.statSync(p).isDirectory()) {
                            fs_1.default.readdirSync(p).forEach(sp => {
                                compile_all(path_1.default.join(p, sp));
                            });
                        }
                        else {
                            let relative_filepath = p.substring(this.workdir.length);
                            compile("first_compile_all", relative_filepath);
                        }
                    }
                };
                compile_all(this.workdir);
            }
            // 
            __classPrivateFieldGet(this, _fswatcher).on("change", (event_type, relative_filepath) => {
                if (typeof event_type == "string" && typeof relative_filepath == "string") {
                    if (relative_filepath.match(options?.filter)) {
                        __classPrivateFieldGet(this, _compilation_queue).push([event_type, relative_filepath]);
                    }
                }
            });
            // 
            let compile_loop = () => {
                if (__classPrivateFieldGet(this, _compilation_queue).length > 0) {
                    let compilation = __classPrivateFieldGet(this, _compilation_queue).shift();
                    setTimeout(() => {
                        compile(compilation[0], compilation[1]);
                    });
                }
                setTimeout(() => {
                    if (__classPrivateFieldGet(this, _fswatcher)) {
                        compile_loop();
                    }
                });
            };
            compile_loop();
            //
            __classPrivateFieldGet(this, _fswatcher).on("error", e => this.emit("error", e));
            __classPrivateFieldGet(this, _fswatcher).on("close", () => {
                __classPrivateFieldSet(this, _fswatcher, null);
                this.emit("stop");
            });
            this.emit("start");
        }
    }
    stop() {
        __classPrivateFieldGet(this, _fswatcher)?.close();
    }
}
exports.default = WatchPile;
_fswatcher_abort_controller = new WeakMap(), _fswatcher = new WeakMap(), _workdir = new WeakMap(), _outdir = new WeakMap(), _compilation_queue = new WeakMap();
