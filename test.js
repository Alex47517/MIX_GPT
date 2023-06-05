const puppeteer = require('puppeteer');
const readline = require('readline');
const https = require('https');
const fs = require('fs').promises;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function readFile(file) {
    try {
        return await fs.readFile(file, 'utf-8');
    } catch (error) {
        console.error(`Помилка при зчитуванні файлу " ${file}": ${error.message}`);
        process.exit(1);
    }
}

(async () => {
    const [openaiApiKey, screenResolution] = await Promise.all([
        readFile('api_key.txt'),
        readFile('screen_resolution_settings.txt'),
    ]);

    const [width, height] = screenResolution.split(',').map(Number);
    const browser = await puppeteer.launch({
        headless: false,
        args: [`--window-size=${width},${height}`],
        executablePath: 'chrome-win/chrome.exe',
    });
    console.log('=-=-=-=-=-=-=-=-=-=-=-=');
    console.log('MIX GPT v1.1 by @alex47517');
    console.log('=-=-=-=-=-=-=-=-=-=-=-=');
    const page = await browser.newPage();
    await page.goto('https://mix.sumdu.edu.ua/');
    await page.setViewport({width: width, height: height});

    const { ChatGPTAPI } = await import('chatgpt');

    const cycle = async () => {
        rl.question('Натисніть Enter для вирішення питання, або введіть "exit" для виходу $>', async (answer) => {
            if (answer.toLowerCase() === 'exit') {
                await browser.close();
                rl.close();
                return;
            }

            try {
                let questionElement = await page.$x('//*[@id="form"]/p');
                let question = await page.evaluate(el => el.textContent, questionElement[0]);
                // Если в элементе нет текста, попытаться получить текст из другого элемента
                //questionElement = await page.$x('//*[@id="form"]/p[2]');
                //question += '\n';
                //question += await page.evaluate(el => el.textContent, questionElement[0]);

                let i = 1;
                let answers = [];
                while (true) {
                    const answerElement = await page.$x(`//*[@id="form"]/table/tbody/tr[${i}]/td/label`);
                    if (answerElement.length === 0) break;  // Если элемента нет, то выходим из цикла
                    let answer = await page.evaluate(el => el.textContent, answerElement[0]);
                    answers.push(answer);
                    i++;
                }
                console.log('===========================================');
                console.log(`Питання: ${question}\nВаріанти відповіді:\n${answers.map((a, i) => `${i+1}) ${a}`).join("\n")}`);
                console.log('===========================================');
                let text = `Виріши питання: ${question}\nПиши тільки цифру з правильною відповіддю\nВаріанти відповіді:\n${answers.map((a, i) => `${i+1}) ${a}`).join("\n")}`;

                const api = new ChatGPTAPI({
                    apiKey: openaiApiKey,
                    completionParams: {
                        model: 'gpt-3.5-turbo',
                        temperature: 0.5,
                        top_p: 0.8
                    }
                })
                let res = await api.sendMessage(text)
                console.log('Відповідь: '+res.text);
            } catch (error) {
                console.error(`Виникла помилка: ${error}`);
            }

            await cycle(); // Зацикливание
        });
    };

    cycle(); // Начало первого цикла
})();