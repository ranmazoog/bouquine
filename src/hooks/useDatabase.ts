export function useDatabase() {
    const query = async (sql: string, params: any[] = []) => {
        return await (window as any).electronAPI.dbQuery(sql, params);
    };

    return { query };
}
