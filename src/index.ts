import fs from "fs";
import path from "path";
import { CLI } from "./cli/cli";
import WatchPiler from "./watchpiler";

const cli = new CLI();

cli.registerCommand({
    label: "start",
    help: "watchpiler start <workdir> --tsconfig <tsconfig_paht> [--outdir <outdir>] [--filter <regexp>] [--firstCompileAll]",
    callback: async (label: string, args: any[], cli: CLI) => {
        if(args.length > 0 && args["-tsconfig"]) {

            let options = {
                workdir: path.join(process.cwd(), (args[0] || "./") ),
                outdir: path.join(process.cwd(), (args["-outdir"] || "./") ),
                tsconfig: path.join(process.cwd(), args["-tsconfig"]),
                fitler: new RegExp(args["-filter"] || "(.)+\\.ts$", "g"),
                firstCompileAll: args["-firstCompileAll"] ? true : false
            };

            let watchpiler = new WatchPiler();

            watchpiler.start(options.workdir, options.outdir, { tsconfig: options.tsconfig, filter: options.fitler, firstCompileAll: options.firstCompileAll });

            watchpiler.on("compile", (file: string, outfile: string, event_type: string) => {
                cli.bindConsole();
                if(event_type == "moved_or_deleted") {
                    console.warn(`File "${file}" moved or deleted.`);
                }
                else {
                    console.info(`File "${file}" compiled to "${outfile}".`);
                }
            });

            watchpiler.on("error", e => console.error);

        }
        return true;
    }
});

cli.first({ bindConsole: true });