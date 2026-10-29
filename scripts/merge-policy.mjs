export const MERGE_METHOD = 'squash';

export const configureMergeMethod = api => api('', {method:'PATCH', body:{
  allow_merge_commit:false, allow_squash_merge:true, allow_rebase_merge:false,
  squash_merge_commit_title:'PR_TITLE', squash_merge_commit_message:'BLANK',
  allow_auto_merge:false, delete_branch_on_merge:true
}});

export const mergePullRequest = (api, pr) => api(`pulls/${pr.number}/merge`, {method:'PUT', body:{
  sha:pr.head.sha, merge_method:MERGE_METHOD, commit_title:`${pr.title} (#${pr.number})`, commit_message:''
}});
