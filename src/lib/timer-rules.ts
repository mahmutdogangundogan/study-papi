// Unutulan timer'lar: timer CONFIRM_HOURS boyunca kesintisiz çalışınca "Hâlâ çalışıyor musun?"
// diye sorulur. GRACE_MINUTES içinde onaylanırsa o süre de sayılır ve CONFIRM_HOURS sonra yine sorulur.
// Onaylanmazsa timer durur ve sorunun çıktığı andan sonrası sayılmaz.
export const CONFIRM_HOURS = 3;
export const GRACE_MINUTES = 60;
