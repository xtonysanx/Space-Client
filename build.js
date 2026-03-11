const fs = require("fs");

const builder = require('electron-builder')
const JavaScriptObfuscator = require('javascript-obfuscator');
const png2icons = require('png2icons');
const { Jimp, JimpMime } = require('jimp');

const { preductname } = require('./package.json');

class Index {
    async init() {
        this.obf = true
        this.Fileslist = []
        process.argv.forEach(async val => {
            if (val.startsWith('--icon')) {
                return this.iconSet(val.split('=')[1])
            }

            if (val.startsWith('--obf')) {
                this.obf = JSON.parse(val.split('=')[1])
                this.Fileslist = this.getFiles("src");
            }

            if (val.startsWith('--build')) {
                let buildType = val.split('=')[1]
                if (buildType == 'platform') return await this.buildPlatform()
            }
        });
    }

    async Obfuscate() {
        if (fs.existsSync("./app")) fs.rmSync("./app", { recursive: true })

        for (let path of this.Fileslist) {
            let fileName = path.split('/').pop()
            let extFile = fileName.split(".").pop()
            let folder = path.replace(`/${fileName}`, '').replace('src', 'app')

            if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true })

            if (extFile == 'js') {
                let code = fs.readFileSync(path, "utf8");
                code = code.replace(/src\//g, 'app/');
                if (this.obf) {
                    await new Promise((resolve) => {
                        console.log(`Obfuscate ${path}`);
                        let obf = JavaScriptObfuscator.obfuscate(code, { optionsPreset: 'medium-obfuscation', disableConsoleOutput: false });
                        resolve(fs.writeFileSync(`${folder}/${fileName}`, obf.getObfuscatedCode(), { encoding: "utf-8" }));
                    })
                } else {
                    console.log(`Copy ${path}`);
                    fs.writeFileSync(`${folder}/${fileName}`, code, { encoding: "utf-8" });
                }
            } else {
                fs.copyFileSync(path, `${folder}/${fileName}`);
            }
        }
    }

    async buildPlatform() {
        await this.Obfuscate();
        builder.build({
            config: {
                generateUpdatesFilesForAllChannels: false,
                appId: preductname,
                productName: preductname,
                copyright: `Copyright © 2026-${new Date().getFullYear()} xToNySaNx`,
                artifactName: "${productName}-${os}-${arch}.${ext}",
                extraMetadata: { main: 'app/app.js' },
                files: ["app/**/*", "package.json", "LICENSE.md"],
                directories: {
                    "output": "dist"
                },
                compression: 'normal',
                asar: true,
                electronDownload: {
                    cache: "./node_modules/.cache/electron"
                },
                nodeGypRebuild: false,
                npmRebuild: true,
                publish: [{
                    provider: "github",
                    releaseType: 'release',
                }],
                win: {
                    icon: "./app/assets/images/icon/icon.ico",
                    target: [{
                        target: "nsis",
                        arch: "x64"
                    },
                    {
                        target: "nsis",
                        arch: "arm64"
                    }]
                },
                nsis: {
                    oneClick: true,
                    allowToChangeInstallationDirectory: false,
                    createDesktopShortcut: true,
                    runAfterFinish: true
                },
                mac: {
                    icon: "./app/assets/images/icon/icon.icns",
                    category: "public.app-category.games",
                    identity: null,
                    hardenedRuntime: false,
                    gatekeeperAssess: false,
                    mergeASARs: true,
                    target: [{
                        target: "dmg",
                        arch: "universal"
                    },
                    {
                        target: "zip",
                        arch: "universal"
                    }]
                },
                dmg: {
                    sign: false,
                    contents: [
                        { x: 130, y: 220 },
                        { x: 410, y: 220, type: 'link', path: '/Applications' }
                    ],
                    artifactName: "${productName}-mac-${arch}.${ext}",
                    format: "ULFO"
                },
                linux: {
                    icon: "./app/assets/images/icon/icon.png",
                    target: [{
                        target: "AppImage",
                        arch: "x64"
                    }]
                }
            }
        }).then(() => {
            console.log('la compilación está terminada')
        }).catch(err => {
            console.error('Error durante la compilación!', err)
        })
    }

    getFiles(path, file = []) {
        if (fs.existsSync(path)) {
            let files = fs.readdirSync(path);
            if (files.length == 0) file.push(path);
            for (let i in files) {
                let name = `${path}/${files[i]}`;
                if (fs.statSync(name).isDirectory()) this.getFiles(name, file);
                else file.push(name);
            }
        }
        return file;
    }

    async iconSet() {
        const buffer = fs.readFileSync('src/assets/images/icon/icon.png');
        let image = await Jimp.read(buffer);
        image = await image.resize({ w: 256, h: 256 }).getBuffer(JimpMime.png);
        fs.writeFileSync("src/assets/images/icon/icon.icns", png2icons.createICNS(image, png2icons.BILINEAR, 0));
        fs.writeFileSync("src/assets/images/icon/icon.ico", png2icons.createICO(image, png2icons.HERMITE, 0, false));
        fs.writeFileSync("src/assets/images/icon/icon.png", image);
    }
}

new Index().init();
