export interface Message {
    content: string;
    userid: string;
    id: string;
}

export function validateMessage(message: any): Message | undefined {
    const content = message.content;
    const userid = message.userid;
    const id = message.id;

    return {
        content,
        userid,
        id
    }
}