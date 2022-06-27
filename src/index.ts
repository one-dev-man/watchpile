import fs from "fs";
import path from "path";
import nodtilus from "nodtilus";
import { Shellmin } from "shellmin";
import WatchPile from "./watchpile";

const shellmin = new Shellmin();

shellmin.registerCommand({
    label: "start",
    help: "WatchPile start <workdir> --tsconfig <tsconfig_path> [--outdir <outdir>] [--filter <regexp>] [--firstCompileAll] [--log-output <log_output_path>]",
    callback: async (label: string, args: any[], cli: Shellmin) => {
        if(args.length > 0 && args["-tsconfig"]) {

            let options = {
                workdir: path.join(process.cwd(), (args[0] || "./") ),
                outdir: path.join(process.cwd(), (args["-outdir"] || "./dist/") ),
                tsconfig: path.join(process.cwd(), args["-tsconfig"]),
                fitler: new RegExp(args["-filter"] || "(.)+\\.ts$", "g"),
                firstCompileAll: args["-firstCompileAll"] ? true : false,
                log_output_path: args["-log-output"] ? path.join(process.cwd(), args["-log-output"]) : null,
            };
            options.workdir = fs.existsSync(options.workdir) ? options.workdir : fs.existsSync(args[0]) ? args[0] : process.cwd();
            options.outdir = fs.existsSync(options.outdir) ? options.outdir : fs.existsSync(args["-outdir"]) ? args["-outdir"] : path.join(process.cwd(), "./dist/");
            options.tsconfig = fs.existsSync(options.tsconfig) ? options.tsconfig : fs.existsSync(args["-tsconfig"]) ? args["-tsconfig"] : path.join(process.cwd(), "./tsconfig.json");
            // options.log_output_path = options.log_output_path ? fs.existsSync(options.log_output_path) ? options.log_output_path : fs.existsSync(args["-log-output"]) ? args["-log-output"] : null : null;

            // console.log(options);

            if(options.log_output_path) {
                nodtilus.files.mkdirs(path.dirname(options.log_output_path));
                let log_stream = fs.createWriteStream(options.log_output_path);
                process.stdout["__write_"] = process.stdout["write"];
                process.stderr["__write_"] = process.stderr["write"];
                    
                (process.stdout as any)["write"] = (...args: any) => { log_stream.writable ? log_stream.write(args[0].toString("utf-8").replace(/\x1b\[(.)+?m/g, "")) : null; process.stdout["__write_"](...args); };
                (process.stderr as any)["write"] = (...args: any) => { log_stream.writable ? log_stream.write(args[0].toString("utf-8").replace(/\x1b\[(.)+?m/g, "")) : null; process.stderr["__write_"](...args); };
            }

            let watchpile = new WatchPile();

            watchpile.start(options.workdir, options.outdir, { tsconfig: options.tsconfig, filter: options.fitler, firstCompileAll: options.firstCompileAll });

            watchpile.on("compile", (file: string, outfile: string, event_type: string) => {
                cli.bindConsole();
                if(event_type == "moved_or_deleted") {
                    console.warn(`File "§6${file}§r" moved or deleted.`);
                }
                else {
                    console.info(`File "§6${file}§r" compiled to "§6${outfile}§r".`);
                }
            });

            watchpile.on("error", e => console.error);

            console.info("Listening for changes...");
        }
        return true;
    }
});

shellmin.first({ bindConsole: true });