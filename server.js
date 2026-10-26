const express = require('express');
const https = require('https');
const app = express();

app.use(express.json({ limit: '50mb' }));

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

function renovarToken() {
    return new Promise((resolve, reject) => {
        const postData = `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}&grant_type=refresh_token`;
        const options = {
            hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                const data = JSON.parse(body);
                if (data.access_token) resolve(data.access_token);
                else reject(data);
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

app.post('/api/salvar-no-drive', async (req, res) => {
    try {
        const { nomeArquivo, conteudoBase64 } = req.body;
        const accessToken = await renovarToken();
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        const metadata = { 'name': nomeArquivo };
        const multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: text/plain\r\n' + 'Content-Transfer-Encoding: base64\r\n\r\n' + conteudoBase64 + close_delim;

        const options = {
            hostname: 'www.googleapis.com', path: '/upload/drive/v3/files?uploadType=multipart', method: 'POST',
            headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'multipart/related; boundary="' + boundary + '"', 'Content-Length': Buffer.byteLength(multipartRequestBody) }
        };
        const googleReq = https.request(options, (googleRes) => {
            let googleBody = '';
            googleRes.on('data', (chunk) => googleBody += chunk);
            googleRes.on('end', () => {
                if (googleRes.statusCode === 200) res.json({ status: "sucesso" });
                else res.status(500).json({ erro: "Erro no Upload: " + googleBody });
            });
        });
        googleReq.write(multipartRequestBody);
        googleReq.end();
    } catch (erro) {
        res.status(500).json({ erro: "Erro no Token: " + JSON.stringify(erro) });
    }
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>TANA OS ROOTS</title>
        <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; overflow: hidden; height: 100vh; background-color: #0067c0; color: #fff; user-select: none; }
            #boot-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; padding: 20px; box-sizing: border-box; z-index: 100; background: #000; color: #00ff00; font-family: 'Courier New', monospace; }
            .boot-text { font-size: 14px; margin-bottom: 8px; }
            #desktop { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            #app-grid { padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, 80px); gap: 20px; justify-content: center; margin-top: 40px; }
            .app-icon { width: 80px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; }
            .app-icon div { width: 60px; height: 60px; background: #fff; border-radius: 15px; display: flex; justify-content: center; align-items: center; font-size: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); margin-bottom: 8px;}
            .app-icon span { font-size: 12px; text-shadow: 1px 1px 2px #000; }
            #taskbar { display: none; position: absolute; bottom: 0; width: 100%; height: 50px; background-color: rgba(240, 240, 240, 0.95); text-align: center; border-top: 1px solid #ccc; }
            .task-icon { display: inline-block; width: 40px; height: 40px; margin-top: 5px; margin-left: 5px; border-radius: 5px; cursor: pointer; font-size: 24px; line-height: 40px; text-align: center; color: #0067c0; }
            #hora { position: absolute; right: 15px; top: 10px; font-size: 12px; color: #333; text-align: right; line-height: 1.2; font-weight: bold; }
            #janela { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 500px; height: 350px; background: #fff; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); z-index: 40; color: #000; display: flex; flex-direction: column; }
            #barra-titulo { background: #e0e0e0; padding: 12px; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between;}
            #fechar { cursor: pointer; color: #f00; padding: 0 10px; font-weight: bold;}
            #textarea { flex: 1; border: none; padding: 15px; outline: none; resize: none; font-size: 16px; border-radius: 0 0 10px 10px; }
            .btn-salvar { background: #0067c0; color: white; border: none; padding: 12px; font-weight: bold; cursor: pointer; margin: 10px; border-radius: 8px; font-size: 16px;}
            @media (min-width: 768px) {
                #taskbar { display: block; }
                #app-grid { grid-template-columns: repeat(auto-fill, 100px); justify-content: flex-start; margin-top: 20px; margin-left: 20px;}
                .app-icon { width: 100px; }
                .app-icon div { width: 80px; height: 80px; font-size: 40px; }
                .app-icon span { font-size: 14px; }
            }
        </style>
    </head>
    <body>
        <div id="boot-screen">
            <div id="terminal"></div>
        </div>

        <div id="desktop">
            <div id="app-grid">
                <div class="app-icon" onclick="abrirBloco()">
                    <div>📄</div><span>Notas</span>
                </div>
                <div class="app-icon">
                    <div>🌐</div><span>Browser</span>
                </div>
                <div class="app-icon">
                    <div>⚙️</div><span>Ajustes</span>
                </div>
            </div>

            <div id="janela">
                <div id="barra-titulo">
                    <span>📄 Bloco de Notas</span>
                    <span id="fechar" onclick="fecharBloco()">X</span>
                </div>
                <textarea id="textarea" placeholder="Digite suas notas aqui. Salva direto no Google Drive..."></textarea>
                <button class="btn-salvar" onclick="salvarNoDrive()">Salvar na Nuvem</button>
            </div>

            <div id="taskbar">
                <div class="task-icon">⊞</div>
                <div class="task-icon" onclick="abrirBloco()">📄</div>
                <div class="task-icon">🌐</div>
                <div id="hora">Iniciando...</div>
            </div>
        </div>

        <script>
            var terminal = document.getElementById("terminal");
            var linhas = [
                "TANA OS v1.0 - Iniciando...",
                "Carregando modulos do kernel...",
                "Verificando Root Access... OK",
                "Conectando ao servidor da Vercel...",
                "Autenticando com a API do Google...",
                "Montando Drive (Google Drive)... OK",
                "Iniciando interface...",
                "TANA OS carregado com sucesso!"
            ];

            var i = 0;
            function boot() {
                if (i < linhas.length) {
                    terminal.innerHTML += '<div class="boot-text">&gt; ' + linhas[i] + '</div>';
                    i++;
                    setTimeout(boot, 400);
                } else {
                    setTimeout(function() {
                        document.getElementById("boot-screen").style.display = "none";
                        document.getElementById("desktop").style.display = "block";
                        iniciarRelogio();
                    }, 600);
                }
            }

            window.onload = boot;

            function abrirBloco() { 
                var j = document.getElementById('janela');
                j.style.display = 'flex';
            }
            function fecharBloco() { document.getElementById('janela').style.display = 'none'; }

            function iniciarRelogio() {
                setInterval(function() {
                    var d = new Date();
                    var h = d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
                    var data = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear();
                    var relogio = document.getElementById('hora');
                    if (relogio) relogio.innerHTML = h + '<br>' + data;
                }, 1000);
            }

            function salvarNoDrive() {
                var texto = document.getElementById('textarea').value;
                if(texto === "") return alert("Digite algo primeiro!");
                
                fetch('/api/salvar-no-drive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nomeArquivo: "TANA_OS_NOTA.txt", conteudoBase64: btoa(texto) })
                })
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if(data.status === 'sucesso') alert("Arquivo salvo no Google Drive!");
                    else alert(data.erro || "Erro desconhecido");
                });
            }
        </script>
    </body>
    </html>
    `);
});

app.listen(3000, () => console.log("TANA OS ligado!"));
