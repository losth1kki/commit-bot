const axios = require('axios');
const moment = require('moment');
const cron = require('node-cron');

require('dotenv').config();

const telegram_token = process.env.TELEGRAM_TOKEN;
const telegram_chat_id = process.env.TELEGRAM_CHAT_ID;
const thread_id = process.env.TELEGRAM_THREAD_ID;
const github_token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

function sendTelegramMessage(chat_id, message) {
	const url = `https://api.telegram.org/bot${telegram_token}/sendMessage`
	axios.post(url, {
		chat_id,
		text: message,
		message_thread_id: thread_id,
		parse_mode: 'Markdown',
		disable_web_page_preview: true
	})
	.catch(error => {
		console.log('Ошибка при отправке сообщения:', error);
	});
};

async function getCommitsForCurrentMinute() {
	const startTime = moment().subtract(1, 'minute').startOf('minute').toISOString();
	const endTime = moment(startTime).add(1, 'minute').toISOString();

	try {
		const url = `https://api.github.com/repos/${owner}/${repo}/commits`
		const response = await axios.get(url, {
			headers: {
				'Authorization': `Bearer ${github_token}`
			},

			params: {
				since: startTime,
				until: endTime
			}
		});

		if (response.data && response.data.length > 0) {
			let message = '*🚀 Последние коммиты:*\n\n';

			response.data.forEach(commit => {
				const author = commit.committer.login;
				const profileUrl = `https://github.com/${author}`;
				const commitUrl = commit.html_url;
				const commitSha = commit.sha.substring(0, 7);
				const date = moment(commit.commit.committer.date).format('YYYY-MM-DD HH:mm:ss');
				const commitMessage = commit.commit.message;

				message += `👤 *Автор:* [${author}](${profileUrl})\n`;
				message += `📅 *Дата:* ${date}\n`;
				message += `💬 *Сообщение:* ${commitMessage}\n`;
				message += `🔗 [Ссылка на коммит](${commitUrl})\n`;
				message += `🔑 SHA: *${commitSha}*\n`
				message += '\n';
			});

			return message;
		}
	} catch (error) {
		console.error('Ошибка при получении коммитов:', error);
	};

	return null;
}

cron.schedule('* * * * *', async () => {
	const commitsMessage = await getCommitsForCurrentMinute();
	if (!commitsMessage) return;
	sendTelegramMessage(telegram_chat_id, commitsMessage);
});

