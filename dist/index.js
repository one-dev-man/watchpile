"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const nodtilus_1 = __importDefault(require("nodtilus"));
const shellmin_1 = require("shellmin");
const watchpile_1 = __importDefault(require("./watchpile"));
const shellmin = new shellmin_1.Shellmin();
shellmin.registerCommand({
    label: "start",
    help: "watchpile start <workdir> <outdir> --tsconfig <tsconfig_path> [--filter <regexp>] [--firstCompileAll] [--log-output <log_output_path>]",
    callback: async (label, args, cli) => {
        if (args.length > 1 && args["-tsconfig"]) {
            let options = {
                workdir: path_1.default.join(process.cwd(), (args[0] || "./")),
                outdir: path_1.default.join(process.cwd(), (args[1] || "./dist/")),
                tsconfig: path_1.default.join(process.cwd(), args["-tsconfig"]),
                fitler: new RegExp(args["-filter"] || "(.)+\\.ts$", "g"),
                firstCompileAll: args["-firstCompileAll"] ? true : false,
                log_output_path: args["-log-output"] ? path_1.default.join(process.cwd(), args["-log-output"]) : null,
            };
            options.workdir = fs_1.default.existsSync(options.workdir) ? options.workdir : fs_1.default.existsSync(args[0]) ? args[0] : process.cwd();
            // options.outdir = fs.existsSync(options.outdir) ? options.outdir : fs.existsSync(args[1]) ? args[1] : path.join(process.cwd(), "./dist/");
            options.tsconfig = fs_1.default.existsSync(options.tsconfig) ? options.tsconfig : fs_1.default.existsSync(args["-tsconfig"]) ? args["-tsconfig"] : path_1.default.join(process.cwd(), "./tsconfig.json");
            // options.log_output_path = options.log_output_path ? fs.existsSync(options.log_output_path) ? options.log_output_path : fs.existsSync(args["-log-output"]) ? args["-log-output"] : null : null;
            // console.log(options);
            nodtilus_1.default.files.mkdirs(path_1.default.dirname(options.outdir));
            if (options.log_output_path) {
                nodtilus_1.default.files.mkdirs(path_1.default.dirname(options.log_output_path));
                let log_stream = fs_1.default.createWriteStream(options.log_output_path);
                process.stdout["__write_"] = process.stdout["write"];
                process.stderr["__write_"] = process.stderr["write"];
                process.stdout["write"] = (...args) => { log_stream.writable ? log_stream.write(args[0].toString("utf-8").replace(/\x1b\[(.)+?m/g, "")) : null; process.stdout["__write_"](...args); };
                process.stderr["write"] = (...args) => { log_stream.writable ? log_stream.write(args[0].toString("utf-8").replace(/\x1b\[(.)+?m/g, "")) : null; process.stderr["__write_"](...args); };
            }
            let watchpile = new watchpile_1.default();
            watchpile.start(options.workdir, options.outdir, { tsconfig: options.tsconfig, filter: options.fitler, firstCompileAll: options.firstCompileAll });
            watchpile.on("compile", (file, outfile, event_type) => {
                cli.bindConsole();
                if (event_type == "moved_or_deleted") {
                    console.warn(`File "§6${file}§r" moved or deleted.`);
                }
                else {
                    console.info(`File "§6${file}§r" compiled to "§6${outfile}§r"${event_type == "first_compile_all" ? " (§efirst compilation§r)" : ""}.`);
                }
            });
            watchpile.on("error", e => console.error);
            console.info("Listening for changes...");
            return true;
        }
        return false;
    }
});
shellmin.first({ bindConsole: true });
