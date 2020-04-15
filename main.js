// External Dependencies
const { context, GitHub } = require('@actions/github');
const core = require('@actions/core');

const commits = context.payload.commits.filter(c => c.distinct);
const repo = context.payload.repository;
const owner = repo.organization || repo.owner.name;

const FILES = [];
const FILES_MODIFIED = [];
const FILES_ADDED = [];
const FILES_DELETED = [];
const FILES_RENAMED = [];

const gh = new GitHub(core.getInput('token'));

function isAdded(file) {
	return 'added' === file.status;
}

function isDeleted(file) {
	return 'deleted' === file.status;
}

function isModified(file) {
	return 'modified' === file.status;
}

function isRenamed(file) {
	return 'renamed' === file.status;
}

async function processCommit(commit) {
	result = await gh.repos.getCommit({ owner: owner, repo: repo.name, ref: commit.id });
	const pattern = core.getInput('pattern')
	const re = new RegExp(pattern.length > 0 ? pattern : ".*")

	if (result && result.data) {
		const files = result.data.files;

		files.forEach(file => {
			const res = re.exec(file.filename)
			if (res == null) {
				return
			}
			const name = res[1]

			isModified(file) && FILES.push(name);
			isAdded(file) && FILES.push(name);
			isRenamed(file) && FILES.push(name);

			isModified(file) && FILES_MODIFIED.push(name);
			isAdded(file) && FILES_ADDED.push(name);
			isDeleted(file) && FILES_DELETED.push(name);
			isRenamed(file) && FILES_RENAMED.push(name);
		});
	}
}


Promise.all(commits.map(processCommit)).then(() => {
	core.setOutput("all", FILES.join(' '))
	core.setOutput("added", FILES_ADDED.join(' '))
	core.setOutput("deleted", FILES_DELETED.join(' '))
	core.setOutput("modified", FILES_MODIFIED.join(' '))
	core.setOutput("renamed", FILES_RENAMED.join(' '))
	if (FILES.length === 0) {
		core.warning('No changes found in given format.')
	} else {
		console.log('found matches', FILES.join(' '))
	}
}).catch(error => {
	core.setFailed(error.message);
});
