import shell, {exec} from 'shelljs';

export type AsyncRunOpts = {
    cmd: string;
    doneString: string;
};

export default async function runAsync(opts: AsyncRunOpts) {
    return new Promise((res, rej) => {
        const e = exec(opts.cmd, {async: true});

        if (!e.stderr || !e.stdout) {
            rej("Unable to listen to stderr and stdout of the docker command.  Docker has failed.");
            return;
        }

        function onOut(data: string) {
            const lines = data.split('\n');
            lines.forEach((l: string) => {
                if (~l.indexOf(opts.doneString)) {
                    detach();
                    res();
                }
            });
        }

        function onErr(data: string) {
            detach();
            rej(data);
        }

        function detach() {
            if (e.stderr) {
                e.stderr.off("data", onErr);
            }

            if (e.stdout) {
                e.stdout.off("data", onOut);
            }
        }

        e.stdout.on("data", onOut);
        e.stderr.on("data", onErr);
    });
}

