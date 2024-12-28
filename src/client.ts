export async function callRpc(action: string, body: any) {
    const response = await fetch(`/rpc/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return response.json();
}

export function useSubmission(actionName: string) {
    return async function handleSubmit(event: Event) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const result = await callRpc(actionName, data);
        console.log(result);
    };
}