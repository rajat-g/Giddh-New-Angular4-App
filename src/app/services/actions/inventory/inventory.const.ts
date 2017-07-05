export class InventoryActionsConst {
  public static GetGroupsWithStocksHierarchyMin = 'GetGroupsWithStocksHierarchyMin';
  public static GetGroupsWithStocksHierarchyMinResponse = 'GetGroupsWithStocksHierarchyMinResponse';
  public static SetActiveStock = 'SetActiveStock';
  public static InventoryGroupToggleOpen = 'InventoryGroupToggleOpen';

  public static GetInventoryGroup = 'GetInventoryGroup';
  public static GetInventoryGroupResponse = 'GetInventoryGroupResponse';
  public static InventoryStockToggleOpen = 'InventoryStockToggleOpen';

  public static GetInventoryStock = 'GetInventoryStock';
  public static GetInventoryStockResponse = 'GetInventoryStockResponse';

  public static AddNewGroup = 'AddNewGroup';
  public static AddNewGroupResponse = 'AddNewGroupResponse';

  public static UpdateGroup = 'UpdateGroup';
  public static UpdateGroupResponse = 'UpdateGroupResponse';

  public static ResetActiveGroup = 'ResetGroup';

  public static RemoveGroup = 'RemoveGroup';
  public static RemoveGroupResponse = 'RemoveGroupResponse';

  public static GetGroupUniqueName = 'GetGroupUniqueName';
  public static GetGroupUniqueNameResponse = 'GetGroupUniqueNameResponse';

  public static GetStockUniqueName = 'GetStockUniqueName';
  public static GetStockUniqueNameResponse = 'GetStockUniqueNameResponse';

  public static GetStock = 'GetStock';
  public static GetStockResponse = 'GetStockResponse';
}

export const CUSTOM_STOCK_UNIT_ACTIONS = {
  CREATE_STOCK_UNIT: 'CREATE_STOCK_UNIT',
  UPDATE_STOCK_UNIT: 'UPDATE_STOCK_UNIT',
  DELETE_STOCK_UNIT: 'DELETE_STOCK_UNIT',
  GET_STOCK_UNIT: 'GET_STOCK_UNIT',
  UPDATE_STOCK_UNIT_RESPONSE: 'UPDATE_STOCK_UNIT_RESPONSE',
  DELETE_STOCK_UNIT_RESPONSE: 'DELETE_STOCK_UNIT_RESPONSE',
  CREATE_STOCK_UNIT_RESPONSE: 'CREATE_STOCK_UNIT_RESPONSE',
  GET_STOCK_UNIT_RESPONSE: 'GET_STOCK_UNIT_RESPONSE',
};

export const STOCKS_REPORT_ACTIONS = {
  GET_STOCKS_REPORT: 'GET_STOCKS_REPORT',
  GET_STOCKS_REPORT_RESPONSE: 'GET_STOCKS_REPORT_RESPONSE',
};
