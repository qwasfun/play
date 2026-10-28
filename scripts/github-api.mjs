export function githubApi({repository = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN, fetcher = fetch} = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) throw Error('GitHub 仓库：请使用 owner/repo 格式');
  if (!token) throw Error('GitHub 授权：请提供有相应仓库权限的 GH_TOKEN 或 GITHUB_TOKEN');
  const request = async (path, {method = 'GET', body, missing = false} = {}) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}${path?'/'+path:''}`, {method, headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(body ? {'Content-Type':'application/json'} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
    if (missing && response.status === 404) return null;
    if (!response.ok) throw Error(`GitHub 操作：${method} ${path.split('?')[0]} 返回 ${response.status}，请检查仓库权限或分支状态`);
    return response.status === 204 ? null : response.json();
  };
  request.pages = async path => {
    const results = [];
    for (let page = 1; ; page++) {
      const data = await request(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);
      results.push(...data);
      if (data.length < 100) return results;
    }
  };
  return request;
}
