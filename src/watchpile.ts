import childprocess from "child_process";
import EventEmitter from "events";
import fs from "fs";
import path from "path";

import nodtilus from "nodtilus";

type WatchPile_Events = "start" | "compile" | "error" | "stop";

export default class WatchPile extends EventEmitter {
    
    #fswatcher_abort_controller: AbortController = new AbortController();
    #fswatcher: fs.FSWatcher | null = null;

    #workdir: string = process.cwd();
    #outdir: string = path.join(process.cwd(), "./dist/");

    #compilation_queue: Array<Array<string>> = new Array<Array<string>>();

    constructor() {
        super();
    }

    //

    addListener(eventName: WatchPile_Events, listener: (...args: any[]) => void): this { return super.addListener(eventName, listener); }
    
    emit(eventName: WatchPile_Events, ...args: any[]): boolean { return super.emit(eventName, ...args); }

    listenerCount(eventName: WatchPile_Events): number { return super.listenerCount(eventName); }

    listeners(eventName: WatchPile_Events): Function[] { return super.listeners(eventName); }

    off(eventName: WatchPile_Events, listener: (...args: any[]) => void): this { return super.off(eventName, listener); }
    
    on(eventName: WatchPile_Events, listener: (...args: any[]) => void): this { return super.on(eventName, listener); }
    
    once(eventName: WatchPile_Events, listener: (...args: any[]) => void): this { return super.once(eventName, listener); }

    prependListener(eventName: WatchPile_Events, listener: (...args: any[]) => void): this { return super.prependListener(eventName, listener); }
    
    prependOnceListener(eventName: WatchPile_Events, listener: (...args: any[]) => void): this { return super.prependOnceListener(eventName, listener); }
    
    rawListeners(eventName: WatchPile_Events): Function[] { return super.rawListeners(eventName); }

    removeAllListeners(event?: WatchPile_Events): this { return super.removeAllListeners(event); }

    removeListener(eventName: WatchPile_Events, listener: (...args: any[]) => void): this { return super.removeListener(eventName, listener); }

    //

    get workdir() { return this.#workdir; }
    
    get outdir() { return this.#outdir; }

    //

    start(workdir: string, outdir: string, options: { tsconfig: string, filter?: RegExp, firstCompileAll?: boolean }) {
        if(!this.#fswatcher) {
            
            this.#workdir = workdir || this.workdir;
            this.#outdir = outdir || this.outdir;

            options.filter = options.filter || new RegExp("(.)+\\.ts$", "g");
            options.firstCompileAll = options.firstCompileAll == true ? true : false;

            // 

            this.#fswatcher = fs.watch(this.workdir, {
                recursive: true,
                encoding: "utf-8",
                persistent: true
            });

            // 

            let compile = async (event_type: string, relative_filepath: string) => {
                let compilation_timestamp = Date.now();

                let filepath = path.join(this.workdir, relative_filepath);
                let out_filepath = path.join(
                    this.outdir,
                    path.dirname(relative_filepath),
                    (
                        path.basename(relative_filepath).substring(
                            0,
                            path.basename(relative_filepath).length - path.extname( path.basename(relative_filepath) ).length
                        )
                        + ".js"
                    )
                );

                if(!fs.existsSync(filepath)) {
                    if(fs.existsSync(out_filepath)) {
                        nodtilus.files.delete(out_filepath);
                        this.emit("compile", filepath, out_filepath, "moved_or_deleted");
                    }
                }
                else {
                    if(!fs.statSync(filepath).isDirectory()) {

                        nodtilus.files.mkdirs(path.dirname(out_filepath));
                        
                        // 

                        let tmp_config_file = path.join(__dirname, "/tmp/", `/${compilation_timestamp}.json`);

                        nodtilus.files.mkdirs(path.dirname(tmp_config_file));
                        fs.copyFileSync(options.tsconfig, tmp_config_file);
                        
                        let tmp_config = JSON.parse(fs.readFileSync(tmp_config_file).toString("utf-8").replace(/((\/\*(.)+\*\/)|(\/\/(.)+))/g, ""));
                        
                        delete tmp_config.include;
                        delete tmp_config.compilerOptions.outDir;
                        delete tmp_config.compilerOptions.outFile;
                        delete tmp_config.compilerOptions.rootDir;
                        delete tmp_config.compilerOptions.rootDirs;
                        tmp_config.include = [filepath];
                        tmp_config.compilerOptions.outDir = this.outdir;
                        // tmp_config.compilerOptions.outFile = path.dirname(out_filepath);
                        tmp_config.compilerOptions.rootDir = this.workdir;
                        
                        fs.writeFileSync(tmp_config_file, JSON.stringify(tmp_config, null, 2));

                        // 

                        try {
                            let command = `tsc --project ${tmp_config_file}`;
                            let compile_process = childprocess.exec(command);

                            compile_process.on("close", () => {
                                fs.unlinkSync(tmp_config_file);
                                
                                this.emit("compile", filepath, out_filepath, event_type);
                            })
                        } catch(e) {
                            console.error(e);
                            if(Object.keys(e as any).includes("stdout")) {
                                console.log( (e as any).stdout.toString("utf-8") );
                            }
                        }
                    }
                }
            }

            // 

            if(options.firstCompileAll) {
                let compile_all = (p: string) => {
                    if(fs.existsSync(p)) {
                        if(fs.statSync(p).isDirectory()) {
                            fs.readdirSync(p).forEach(sp => {
                                compile_all(path.join(p, sp));
                            });
                        }
                        else {
                            let relative_filepath = p.substring(this.workdir.length)
                            compile("first_compile_all", relative_filepath);
                        }
                    }
                }

                compile_all(this.workdir);
            }

            // 

            this.#fswatcher.on("change", (event_type: string, relative_filepath: string) => {
                if(typeof event_type == "string" && typeof relative_filepath == "string") {
                    if(relative_filepath.match(options?.filter as any)) {
                        this.#compilation_queue.push([event_type, relative_filepath]);
                    }
                }
            });

            // 

            let compile_loop = () => {
                if(this.#compilation_queue.length > 0) {
                    let compilation = this.#compilation_queue.shift() as Array<string>;
                    setTimeout(() => {
                        compile(compilation[0], compilation[1]);
                    });
                }
                
                setTimeout(() => {
                    if(this.#fswatcher) {
                        compile_loop();
                    }
                });
            }

            compile_loop();

            //

            this.#fswatcher.on("error", e => this.emit("error", e));
            this.#fswatcher.on("close", () => {
                this.#fswatcher = null;

                this.emit("stop")
            });

            this.emit("start");
        }
    }

    stop() {
        this.#fswatcher?.close();
    }

}

