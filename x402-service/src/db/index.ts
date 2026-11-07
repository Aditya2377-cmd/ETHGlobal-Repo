class MockPreparedStatement {
  run(...params: any[]) {
    return { changes: 1, lastInsertRowid: 1 };
  }
  get(...params: any[]) {
    // Returning null forces the server to create a fresh 402 payment requirement
    return null;
  }
  all(...params: any[]) {
    return [];
  }
}

class MockDatabase {
  exec(sql: string) {
    return this;
  }
  prepare(sql: string) {
    return new MockPreparedStatement();
  }
  pragma(sql: string) {
    return null;
  }
}

const mockDb = new MockDatabase();

export function getDatabase() {
  return mockDb;
}

export default mockDb;