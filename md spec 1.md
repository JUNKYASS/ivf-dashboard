# Техническое задание: Веб-интерфейс парсера остатков поставщиков тканей

## 1. Общее описание

Необходимо разработать веб-приложение, оборачивающее существующий консольный JS-парсер остатков тканей в удобный веб-интерфейс. Backend выполняет ту же логику парсинга, что и текущий код (`parser.js`), но запускается через HTTP API вместо `.bat`-файлов и CLI-аргументов.

**Текущий код парсера:**
```javascript
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const XLSX = require('xlsx');
const { XMLParser } = require('fast-xml-parser');

const GT_BYAZ_220_120_SHEETNAME = 'GT_Byaz_220_120';
const GT_BYAZ_220_140_SHEETNAME = 'GT_Byaz_220_140';
const GT_BYAZ_150_120_SHEETNAME = 'GT_Byaz_150_120';
const GT_BYAZ_150_140_SHEETNAME = 'GT_Byaz_150_140';
const GT_BYAZ_150_120_SOLID_SHEETNAME = 'GT_Byaz_150_120_Solid';
const GT_BYAZ_150_140_SOLID_SHEETNAME = 'GT_Byaz_150_140_Solid';
const GT_POPLIN_220_SHEETNAME = 'GT_Poplin_220';
const TD_SHEETNAME = 'TD';
const AD_SHEETNAME = 'AD';
const TDL_BYAZ_220_SOLID_SHEETNAME = 'TDL_Byaz_220_solid';
const LOGOS_SHEETNAME = 'LB';
const TT_SHEETNAME = 'TT';

const WAREHOUSE_ID = 'СЦ (Коляново) (1020002072018000)';
const NAME_POSTFIX = '+2% к прайсу';
const TD_DATA_EXPORT_URL = 'https://texdesign.ru/bitrix/catalog_export/cloth.xml';

const GALTEX_OZON_RESULT_FILE_PATH = './ready_stocks/galtex-ozon-stocks-updated.xlsx';
const GALTEX_WB_RESULT_FILE_PATH = './ready_stocks/galtex-wb-stocks-updated.xlsx';
const TD_OZON_RESULT_FILE_PATH = './ready_stocks/td-ozon-stocks-updated.xlsx';
const TD_WB_RESULT_FILE_PATH = './ready_stocks/td-wb-stocks-updated.xlsx';
const AD_OZON_RESULT_FILE_PATH = './ready_stocks/ad-ozon-stocks-updated.xlsx';
const AD_WB_RESULT_FILE_PATH = './ready_stocks/ad-wb-stocks-updated.xlsx';
const TDL_OZON_RESULT_FILE_PATH = './ready_stocks/tdl-ozon-stocks-updated.xlsx';
const TDL_WB_RESULT_FILE_PATH = './ready_stocks/tdl-wb-stocks-updated.xlsx';
const LOGOS_OZON_RESULT_FILE_PATH = './ready_stocks/logos-ozon-stocks-updated.xlsx';
const LOGOS_WB_RESULT_FILE_PATH = './ready_stocks/logos-wb-stocks-updated.xlsx';
const TT_OZON_RESULT_FILE_PATH = './ready_stocks/tt-ozon-stocks-updated.xlsx';
const TT_WB_RESULT_FILE_PATH = './ready_stocks/tt-wb-stocks-updated.xlsx';
const MAPPING_FILE_PATH = './mapping.xlsx';
const XLSX_STOCKS_FILE_PATH = './stocks.xlsx';
const XLS_STOCKS_FILE_PATH = './stocks.xls';
const stocksWorkbook = fs.existsSync(XLSX_STOCKS_FILE_PATH)
  ? XLSX.readFile(XLSX_STOCKS_FILE_PATH)
  : fs.existsSync(XLS_STOCKS_FILE_PATH)
    ? XLSX.readFile(XLS_STOCKS_FILE_PATH)
    : false;

const stringToInt = (str) => parseFloat(str.toString().replace(/\s/g, '')); // Преобразование строки в число

const parseTDLStocks = async () => { // TDL (сделано только для бязи 220 однотонной, в будущем можно расширить)
  try {
    const stocksSheetName = stocksWorkbook.SheetNames[0];
    const stocksSheet = stocksWorkbook.Sheets[stocksSheetName];
    const stocksData = XLSX.utils.sheet_to_json(stocksSheet, { header: 1, });
    // console.log(stocksData);

    const mappingWorkBook = XLSX.readFile(MAPPING_FILE_PATH);
    const mappingSheet = mappingWorkBook.Sheets[TDL_BYAZ_220_SOLID_SHEETNAME];
    if (!mappingSheet) return console.log('Sheet not found');
    const mappingData = XLSX.utils.sheet_to_json(mappingSheet, { header: 1 });
    const filteredMappingData = mappingData.filter(row => row[3] !== 0); // Берём из файла mapping только те строки, в которых в 4 столбце не указано 0

    // console.log(mappingData);

    const result = filteredMappingData.map((mappingValue, i) => { // В файле mapping берём каждое значение и ищем его в файле stocks
      const valueMatch = stocksData.find(stocksValue => stocksValue[3] && (stocksValue[3].trim() == mappingValue[1])); // Поиск совпадения по артмкулу поставщика
      const remain = valueMatch && valueMatch.length > 0 && valueMatch[4] > 350 ? 5 : 0;

      return [mappingValue[0], mappingValue[3], remain]; // Возвращаем [артикул Озон, артикул ВБ, остаток]
    });
    // console.log(result);

    return result;
  } catch (error) {
    console.error(error);
  }
};

const parseLogosStocks = async () => {
  try {
    const stocksSheetName = stocksWorkbook.SheetNames[0];
    const stocksSheet = stocksWorkbook.Sheets[stocksSheetName];
    const stocksData = XLSX.utils.sheet_to_json(stocksSheet, { header: 1, });
    // console.log(stocksData);

    const mappingWorkBook = XLSX.readFile(MAPPING_FILE_PATH);
    const mappingSheet = mappingWorkBook.Sheets[LOGOS_SHEETNAME];
    if (!mappingSheet) return console.log('Sheet not found');
    const mappingData = XLSX.utils.sheet_to_json(mappingSheet, { header: 1 });
    const filteredMappingData = mappingData.filter(row => row[3] !== 0); // Берём из файла mapping только те строки, в которых в 4 столбце не указано 0
    // console.log(mappingData);

    const result = filteredMappingData.map((mappingValue, i) => { // В файле mapping берём каждое значение и ищем его в файле stocks
      const valueMatch = stocksData.find(stocksValue => stocksValue[0] && (stocksValue[0].trim() == mappingValue[1])); // Поиск совпадения по артмкулу поставщика
      const remain = valueMatch && valueMatch.length > 0 && valueMatch[15] > 350 ? 10 : 0;
      return [mappingValue[0], mappingValue[2], remain]; // Возвращаем [артикул Озон, артикул ВБ, остаток]
    });
    // console.log(result);

    return result;
  } catch (error) {
    console.error(error);
  }
};

const parseTTStocks = async () => {
  try {
    const stocksSheetName = stocksWorkbook.SheetNames[0];
    const stocksSheet = stocksWorkbook.Sheets[stocksSheetName];
    const stocksData = XLSX.utils.sheet_to_json(stocksSheet, { header: 1, });
    const poplinRowIndex = stocksData.findIndex(element => element.length === 1 && element[0] === 'Поплин'); // Ищем строку Поплин и берём её индекс далее разделяем массив на две части, оставляем только ту, которая идёт до строки Поплин (т.е. берём только бязь) (в остатках есть только бязь и поплин в одной таблице, поэтому нужно разделить их на две части)
    const poplinStocks = poplinRowIndex !== -1 ? stocksData.slice(poplinRowIndex) : stocksData; // Берём из файла stocks только те строки, которые идут после строки Поплин
    const byazStocks = poplinRowIndex !== -1 ? stocksData.slice(0, poplinRowIndex) : stocksData; // Берём из файла stocks только те строки, которые идут до строки Поплин (т.е. берём только бязь)
    // console.log('poplinStocks', poplinStocks)
    // console.log('byazStocks', byazStocks);

    const mappingWorkBook = XLSX.readFile(MAPPING_FILE_PATH);
    const mappingSheet = mappingWorkBook.Sheets[TT_SHEETNAME];
    if (!mappingSheet) return console.log('Sheet not found');
    const mappingData = XLSX.utils.sheet_to_json(mappingSheet, { header: 1 });
    const filteredMappingData = mappingData.filter(row => row[3] !== 0); // Берём из файла mapping только те строки, в которых в 4 столбце не указано 0
    // console.log(mappingData);

    const result = filteredMappingData.map((mappingValue, i) => { // В файле mapping берём каждое значение и ищем его в файле stocks
      let valueMatch;

      if (mappingValue[0] && mappingValue[0].includes('-BZ-')) { // Если в артикуле поставщика есть -BZ-, значит это бязь, ищем совпадение в массиве byazStocks
        valueMatch = byazStocks.find(stocksValue => stocksValue[2] && (stocksValue[2].trim() == mappingValue[1])); // Поиск совпадения по артмкулу поставщика
      } else if (mappingValue[0] && mappingValue[0].includes('-PP-')) { // Если в артикуле поставщика есть -PP-, значит это поплин, ищем совпадение в массиве poplinStocks
        valueMatch = poplinStocks.find(stocksValue => stocksValue[2] && (stocksValue[2].trim() == mappingValue[1])); // Поиск совпадения по артмкулу поставщика
      } else { // Если в артикуле поставщика нет -BZ- или -PP-, значит это что-то другое, ищем совпадение в массиве stocksData
        valueMatch = stocksData.find(stocksValue => stocksValue[2] && (stocksValue[2].trim() == mappingValue[1])); // Поиск совпадения по артмкулу поставщика
      }

      const remain = valueMatch && valueMatch.length > 0 && stringToInt(valueMatch[3]) > 250 ? 10 : 0;
      return [mappingValue[0], mappingValue[2], remain]; // Возвращаем [артикул Озон, артикул ВБ, остаток]
    });
    // console.log(result);

    return result;
  } catch (error) {
    console.error(error);
  }
};

const parseArtdesignStocks = async () => {
  try {
    const stocksSheetName = stocksWorkbook.SheetNames[0];
    const stocksSheet = stocksWorkbook.Sheets[stocksSheetName];
    const stocksData = XLSX.utils.sheet_to_json(stocksSheet, { header: 1, });

    const mappingWorkBook = XLSX.readFile(MAPPING_FILE_PATH);
    const mappingSheet = mappingWorkBook.Sheets[AD_SHEETNAME];
    if (!mappingSheet) return console.log('Sheet not found');
    const mappingData = XLSX.utils.sheet_to_json(mappingSheet, { header: 1 });
    const filteredMappingData = mappingData.filter(row => row[4] !== 0); // Берём из файла mapping только те строки, в которых в 4 столбце не указано 0

    const result = filteredMappingData.map((mappingValue, i) => { // В файле mapping берём каждое значение и ищем его в файле stocks
      const valueMatch = stocksData.find(stocksValue => stocksValue[1] && (stocksValue[1].trim() == mappingValue[2])); // Поиск совпадения по артмкулу поставщика
      const remain = valueMatch && valueMatch.length > 0 && valueMatch[4] > 600 ? 5 : 0;

      return [mappingValue[0], mappingValue[3], remain]; // Возвращаем [артикул Озон, артикул ВБ, остаток]
    });

    return result;
  } catch (error) {
    console.error(error);
  }
}

const parseGaltexStocks = async () => {
  try {
    const stocksSheetName = stocksWorkbook.SheetNames[0];
    const stocksSheet = stocksWorkbook.Sheets[stocksSheetName];
    const stocksData = XLSX.utils.sheet_to_json(stocksSheet, { header: 1, });

    const materialNameRowIndex = stocksData.findIndex(value => value[0] === 'Характеристика') + 1; // Ищем строку Характеристика номенклатуры и берём следующую за ней строку
    const materialNameRow = stocksData[materialNameRowIndex][0] || undefined; // Определяем название материала
    if (!materialNameRow) return console.log('Material name empty');

    const sheetName = (
      materialNameRow.includes('Бязь') && materialNameRow.includes('(220см/120гр) наб') ? GT_BYAZ_220_120_SHEETNAME :
        materialNameRow.includes('Бязь') && materialNameRow.includes('(220см/140гр) наб') ? GT_BYAZ_220_140_SHEETNAME :
          materialNameRow.includes('Бязь') && materialNameRow.includes('(150см/120гр) наб') ? GT_BYAZ_150_120_SHEETNAME :
            materialNameRow.includes('Бязь') && materialNameRow.includes('(150см/140гр) наб') ? GT_BYAZ_150_140_SHEETNAME :
              materialNameRow.includes('Бязь') && materialNameRow.includes('(150см/120гр) гл/кр') ? GT_BYAZ_150_120_SOLID_SHEETNAME :
                materialNameRow.includes('Бязь') && materialNameRow.includes('(150см/140гр) гл/кр') ? GT_BYAZ_150_140_SOLID_SHEETNAME :
                  materialNameRow.includes('Поплин') ? GT_POPLIN_220_SHEETNAME :
                    undefined
    ); // Определяем название листа в зависимости от названия материала
    if (!sheetName) return console.log('Material name not found');

    // Определяем номер столбца из которого брать количество остатков
    const kharakteristikaRow = stocksData.find(value => value[0] === 'Характеристика');
    if (!kharakteristikaRow) return console.log('kharakteristika row not found');
    const stocksCountHeadingIndex = kharakteristikaRow.findIndex(value => value === 'Остаток');

    const mappingWorkBook = XLSX.readFile(MAPPING_FILE_PATH);
    const mappingSheet = mappingWorkBook.Sheets[sheetName];
    if (!mappingSheet) return console.log('Sheet not found');
    const mappingData = XLSX.utils.sheet_to_json(mappingSheet, { header: 1 });
    const filteredMappingData = mappingData.filter(row => row[0] && row[1] && row[3] !== 0); // Берём из файла mapping только те строки, в которых в 4 столбце не указано 0
    const stocksFileValues = stocksData.slice(5); // Берём из файла stocks только те строки, которые идут после технических строк

    // Формируем остатки
    const result = filteredMappingData.map((value, i) => { // В файле mapping берём каждое значение и ищем его в файле stocks

      const valueMatch = stocksFileValues.filter(value2 => (value2[0] + NAME_POSTFIX).includes(value[1])); // Поиск всех совпадений (может быть одно или два)
      const greaterValue = valueMatch.length > 1 ? valueMatch[0][stocksCountHeadingIndex] > valueMatch[1][stocksCountHeadingIndex] ? valueMatch[0] : valueMatch[1] : valueMatch[0]; // Если одно совпадение, то берем его, если два, то берём то, в котором больше остаток
      const remain = greaterValue && greaterValue.length > 0 && stringToInt(greaterValue[stocksCountHeadingIndex]) > 400 ? 10 : 0;
      return [filteredMappingData[i][0], filteredMappingData[i][2], remain];
    });

    return result;
  } catch (error) {
    console.error(error);
  }
};

const parseTexdesignStocks = async () => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false
    }); // Отключаем проверку сертификата

    const response = await axios.get(TD_DATA_EXPORT_URL, { httpsAgent: agent }); // Загружаем XML
    if (response.statusText !== 'OK') throw new Error(`Ошибка загрузки XML: ${response.statusText}`);
    if (!response.headers['content-type']?.includes('xml')) throw new Error('Ответ не является XML-документом');

    const xmlRawData = await response.data.toString();
    if (!xmlRawData || xmlRawData.trim() === '') throw new Error('Загруженный XML-файл пустой или повреждён'); // Проверяем, что данные не пустые

    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
      });

      xmlToJsonData = parser.parse(xmlRawData);
    } catch (parseError) {
      throw new Error(`Не удалось распарсить XML: ${parseError.message}`);
    }

    const allItems = xmlToJsonData.yml_catalog?.shop?.offers?.offer;
    if (!allItems || allItems.length === 0) throw new Error('XML-файл не содержит ни одного товара');

    const workbook = XLSX.readFile(MAPPING_FILE_PATH); // Получаем данные соответствия
    const sheet = workbook.Sheets[TD_SHEETNAME];
    const mappingData = XLSX.utils.sheet_to_json(sheet, { header: 1, });
    const filteredMappingData = mappingData.filter(row => row[3] !== 0); // Берём из файла mapping только те строки, в которых в 4 столбце не указано 0

    // Формируем остатки
    const result = filteredMappingData.filter(value => value[1]).map((article, i) => {
      const matchedItem = allItems.find(item => item.param.find(param => param['@_name'] == 'Артикул')?.['#text'] == article[1]); // Ищем среди всех товаров совпадающий артикул

      const qty = matchedItem?.param?.find(param => param['@_name'] == 'Количество')?.['#text']; // Выбираем параметр "Количество"
      const remain = qty && qty > 600 ? 5 : 0;

      return [article[0], article[2], remain];
    });

    return result;
  } catch (error) {
    console.error(error);
  }
};

const createXLSXFile = (data, fileName) => { // Сохранение XLSX файла
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Результаты");
  XLSX.writeFile(wb, fileName);

  console.log(`Результат успешно записан в файл: ${fileName}`);
};

const main = async () => {
  try {
    const arg = process.argv.slice(2)[0];
    let data, resultOzon, resultWb;

    switch (arg) {
      case 'galtex': // Сохраняем остатки для Galtex
        data = await parseGaltexStocks();

        resultOzon = data.map(item => ({
          'Название склада (идентификатор склада)': WAREHOUSE_ID,
          'Артикул': item[0],
          'Название товара': '',
          'Доступно на складе, шт': item[2]
        }));

        resultWb = data.filter(elem => elem[1]).map(item => ({
          'Баркод': item[1],
          'Количество': item[2],
        }));

        createXLSXFile(resultOzon, GALTEX_OZON_RESULT_FILE_PATH);
        createXLSXFile(resultWb, GALTEX_WB_RESULT_FILE_PATH);

        break;
      case 'td': // Сохраняем остатки для Texdesign
        data = await parseTexdesignStocks();

        resultOzon = data.map(item => ({
          'Название склада (идентификатор склада)': WAREHOUSE_ID,
          'Артикул': item[0],
          'Название товара': '',
          'Доступно на складе, шт': item[2]
        }));

        resultWb = data.filter(elem => elem[1]).map(item => ({
          'Баркод': item[1],
          'Количество': item[2],
        }));

        createXLSXFile(resultOzon, TD_OZON_RESULT_FILE_PATH);
        createXLSXFile(resultWb, TD_WB_RESULT_FILE_PATH);

        break;
      case 'ad': // Сохраняем остатки для ArtDesign
        data = await parseArtdesignStocks();

        resultOzon = data.map(item => ({
          'Название склада (идентификатор склада)': WAREHOUSE_ID,
          'Артикул': item[0],
          'Название товара': '',
          'Доступно на складе, шт': item[2]
        }));

        resultWb = data.filter(elem => elem[1]).map(item => ({
          'Баркод': item[1],
          'Количество': item[2],
        }));

        createXLSXFile(resultOzon, AD_OZON_RESULT_FILE_PATH);
        createXLSXFile(resultWb, AD_WB_RESULT_FILE_PATH);

        break;
      case 'TDL': // Сохраняем остатки для TDL
        data = await parseTDLStocks();

        resultOzon = data.map(item => ({
          'Название склада (идентификатор склада)': WAREHOUSE_ID,
          'Артикул': item[0],
          'Название товара': '',
          'Доступно на складе, шт': item[2]
        }));

        resultWb = data.filter(elem => elem[1]).map(item => ({
          'Баркод': item[1],
          'Количество': item[2],
        }));

        createXLSXFile(resultOzon, TDL_OZON_RESULT_FILE_PATH);
        createXLSXFile(resultWb, TDL_WB_RESULT_FILE_PATH);

        break;
      case 'logos': // Сохраняем остатки для Logos
        data = await parseLogosStocks();

        resultOzon = data.map(item => ({
          'Название склада (идентификатор склада)': WAREHOUSE_ID,
          'Артикул': item[0],
          'Название товара': '',
          'Доступно на складе, шт': item[2]
        }));

        resultWb = data.filter(elem => elem[1]).map(item => ({
          'Баркод': item[1],
          'Количество': item[2],
        }));

        createXLSXFile(resultOzon, LOGOS_OZON_RESULT_FILE_PATH);
        createXLSXFile(resultWb, LOGOS_WB_RESULT_FILE_PATH);

        break;
      case 'TT': // Сохраняем остатки для Традиции Текстиля
        data = await parseTTStocks();

        resultOzon = data.map(item => ({
          'Название склада (идентификатор склада)': WAREHOUSE_ID,
          'Артикул': item[0],
          'Название товара': '',
          'Доступно на складе, шт': item[2]
        }));

        resultWb = data.filter(elem => elem[1]).map(item => ({
          'Баркод': item[1],
          'Количество': item[2],
        }));

        createXLSXFile(resultOzon, TT_OZON_RESULT_FILE_PATH);
        createXLSXFile(resultWb, TT_WB_RESULT_FILE_PATH);

        break;
      default:
        console.log('Unknown argument');
    }
  } catch (error) {
    console.error(error);
  }
};

main();
```

## 2. Технологический стек

- **Backend:** Node.js + Express, TypeScript
- **Frontend:** React + TypeScript
- **Хранение конфигурации:** файловое хранилище на сервере (JSON-файл конфигурации + сохранённый mapping-файл на диске). База данных не требуется.
- **Парсинг Excel:** библиотека `xlsx` (как в текущем коде)
- **Парсинг XML:** `fast-xml-parser` + `axios` (как в текущем коде)
- **Окружение:** локальный запуск для разработки/тестирования, продакшн — VPS-хостинг

## 3. Аутентификация

- Базовая HTTP-аутентификация (браузерное окно ввода логина/пароля) на уровне всего приложения (backend middleware, до отдачи любых страниц/API).
- Логин: `root`
- Пароль: `root`
- Реализовать через middleware Express (например, `express-basic-auth`), применяется ко всем маршрутам без исключений.

## 4. Структура сайта

Два раздела (роута):

1. **`/parser`** (главная страница) — интерфейс парсера остатков.
2. **`/stickers`** — страница "Генерация стикеров". На данном этапе — пустая заглушка с заголовком "Генерация стикеров" и текстом-плейсхолдером о том, что раздел в разработке.

Общая навигация (шапка/сайдбар) с переключением между двумя страницами.

## 5. Страница "Парсер" — структура разделов

Страница состоит из следующих блоков:

### 5.1. Блок "Файл соответствия артикулов (mapping)"

- Один инпут загрузки Excel-файла (`.xlsx`).
- Загруженный файл **сохраняется на сервере постоянно** (перезаписывает предыдущий) и используется во всех последующих генерациях, пока пользователь не загрузит новый.
- В интерфейсе отображать: имя текущего сохранённого файла, дату/время последней загрузки.
- Кнопка "Заменить файл" — загрузка нового файла с заменой сохранённого.
- Внутри этого единого mapping-файла разные листы (sheets) используются разными поставщиками (см. раздел 7). Файл общий — листы разделены по поставщику/материалу.

### 5.2. Блок "Пороговые значения по поставщикам"

Для каждого поставщика (и для каждого материала Galtex — см. п. 7.1) отображаются два редактируемых числовых поля:

- **Порог остатка** (threshold) — значение, с которым сравнивается фактический остаток поставщика.
- **Устанавливаемый остаток** (remain) — значение, которое проставляется в итоговый файл, если фактический остаток поставщика **больше** порога; если не больше — проставляется `0`.

Логика: `остаток_в_итоговом_файле = (остаток_поставщика > порог) ? remain : 0`

- По умолчанию поля заполнены значениями, зашитыми в текущем коде (см. таблицу в разделе 7).
- Изменения сохраняются в конфиг на сервере (JSON) и подгружаются при каждой загрузке страницы.
- Каждое поле сохраняется отдельным вызовом на backend (autosave по blur/изменению, либо кнопка "Сохранить" в этом блоке).

### 5.3. Разделы по каждому поставщику

Каждый поставщик — отдельная карточка/секция со своим состоянием. Секции:

1. **Galtex**
2. **ТексДизайн (TexDesign)**
3. **АртДизайн (ArtDesign)**
4. **ТДЛ (TDL)**
5. **ЛогатексПРО (Logos)**
6. **Традиции Текстиля (TT)**

Общая структура секции для поставщиков 1, 3, 4, 5, 6 (не TexDesign):

- Инпут(ы) загрузки файла остатков (`.xlsx` / `.xls`).
- У **Galtex** — 7 отдельных инпутов (по одному на каждый вид материала, см. п. 7.1), у остальных поставщиков — один инпут.
- Пороговые значения (из блока 5.2), относящиеся к этому поставщику, можно отображать прямо в карточке поставщика (дублирование значений из общего блока настроек — на усмотрение реализации, главное чтобы редактирование было доступно и сохранялось).
- Статус обработки после генерации: "Не обработан" / "Обработан успешно" / "Ошибка" с текстом ошибки.
- Загружаемые файлы **не сохраняются на сервере** — они хранятся только в состоянии инпута на фронтенде до перезагрузки страницы. При обновлении страницы поля загрузки снова пустые.

Структура секции **ТексДизайн**:

- Нет инпута загрузки файла.
- Есть текстовое поле ввода URL .xml выгрузки.
- URL **сохраняется на сервере постоянно** (JSON-конфиг) и подставляется автоматически при каждой загрузке страницы. Автосохранение при изменении поля (например, по blur или кнопке "Сохранить").
- Значение по умолчанию (если конфиг пуст): `https://texdesign.ru/bitrix/catalog_export/cloth.xml`
- Пороговые значения (threshold/remain) — как у остальных поставщиков.
- Статус обработки — как у остальных.

### 5.4. Блок генерации

- Одна общая кнопка **"Сгенерировать файлы остатков"**.
- При нажатии backend последовательно (или параллельно) обрабатывает всех поставщиков, для которых:
  - загружен файл остатков (для galtex — хотя бы один из 7 материалов), ИЛИ
  - это TexDesign (файл не требуется, но нужен доступный URL).
- Поставщики без загруженного файла **пропускаются молча** (без ошибки, просто не участвуют в итоговом файле; в UI можно показать статус "Пропущен — файл не загружен").
- Если при обработке конкретного поставщика возникает ошибка — она отображается в статусе этого поставщика, обработка остальных поставщиков **продолжается**.
- По завершении генерируются два сводных файла:
  - **`ozon-stocks.xlsx`** — объединение результатов всех успешно обработанных поставщиков в одну таблицу (один лист, одна структура колонок, как в текущем коде — см. раздел 8).
  - **`wb-stocks.xlsx`** — аналогично для Wildberries.
- Оба файла **автоматически скачиваются** в браузер сразу после завершения генерации.
- После успешной генерации появляюься **ссылки на скачивание** итоговых файлов остатков (до следующей генерации), на случай если автоскачивание было заблокировано браузером или файл нужно скачать повторно.
- Пока идёт генерация — показывать индикатор загрузки/прогресса и блокировать повторное нажатие кнопки.

## 6. Хранение конфигурации на сервере

Файловое JSON-хранилище, например `config/settings.json`, содержащее:

```javascript
{
  "texdesignUrl": "https://texdesign.ru/bitrix/catalog_export/cloth.xml",
  "thresholds": {
    "galtex_gt_byaz_220_120": { "threshold": 400, "remain": 10 },
    "galtex_gt_byaz_220_140": { "threshold": 400, "remain": 10 },
    "galtex_gt_byaz_150_120": { "threshold": 400, "remain": 10 },
    "galtex_gt_byaz_150_140": { "threshold": 400, "remain": 10 },
    "galtex_gt_byaz_150_120_solid": { "threshold": 400, "remain": 10 },
    "galtex_gt_byaz_150_140_solid": { "threshold": 400, "remain": 10 },
    "galtex_gt_poplin_220": { "threshold": 400, "remain": 10 },
    "td": { "threshold": 600, "remain": 5 },
    "ad": { "threshold": 600, "remain": 5 },
    "tdl": { "threshold": 350, "remain": 5 },
    "logos": { "threshold": 350, "remain": 10 },
    "tt": { "threshold": 250, "remain": 10 }
  },
  "mappingFile": {
    "storedFileName": "mapping.xlsx",
    "originalFileName": "mapping_20250101.xlsx",
    "uploadedAt": "2026-07-15T10:00:00.000Z"
  }
}
```

Mapping-файл физически хранится на диске сервера, например `storage/mapping.xlsx`, путь фиксирован (перезаписывается при загрузке нового файла).

Сгенерированные итоговые файлы (`ozon-stocks.xlsx`, `wb-stocks.xlsx`) также сохраняются на диске (например, `storage/output/`) для возможности повторного скачивания по ссылке без повторной генерации.

## 7. Специфика парсинга по поставщикам (перенести логику из текущего кода как есть)

### 7.1. Galtex

Определение материала происходит **автоматически из содержимого файла** остатков (по строке "Характеристика" и следующей за ней строке с названием номенклатуры). Каждый из 7 инпутов на фронте соответствует конкретному ожидаемому виду материала и обрабатывается независимо, используя соответствующий лист mapping-файла:

| № | Материал (пример названия в файле)           | Лист mapping              |
|---|----------------------------------------------|---------------------------|
| 1 | Бязь 220см/120гр наб.                        | `GT_Byaz_220_120`         |
| 2 | Бязь 220см/140гр наб.                        | `GT_Byaz_220_140`         |
| 3 | Бязь 150см/120гр наб.                        | `GT_Byaz_150_120`         |
| 4 | Бязь 150см/140гр наб.                        | `GT_Byaz_150_140`         |
| 5 | Бязь 150см/120гр гл/кр                       | `GT_Byaz_150_120_Solid`   |
| 6 | Бязь 150см/140гр гл/кр                       | `GT_Byaz_150_140_Solid`   |
| 7 | Поплин 220                                   | `GT_Poplin_220`           |

Логика по каждому загруженному файлу:

1. Найти строку `Характеристика`, определить название материала из следующей строки, определить нужный лист mapping.
2. Определить индекс колонки "Остаток" по заголовкам строки `Характеристика`.
3. Взять строки mapping-листа, где артикул поставщика (колонка 1) заполнен, наш артикул (колонка 0) заполнен и колонка 3 ≠ 0.
4. Для каждой строки mapping найти совпадение(я) в данных остатков (сравнение `название_товара + '+2% к прайсу'` содержит артикул поставщика из mapping); если совпадений два — брать то, где остаток больше.
5. Порог/остаток — по настройке конкретного материала (или общей настройке Galtex, если сделано одно значение на всего поставщика — уточнить при реализации, дефолт: порог 400, остаток 10 для всех 7 материалов).
6. Результат по всем 7 материалам объединяется в единый общий результат по Galtex перед формированием строк Ozon/WB.

Если файл для конкретного материала не загружен — этот материал просто не участвует, без ошибки.

### 7.2. ТексДизайн (TexDesign)

- Не файл, а XML по URL (сохранённый в конфиге).
- Загрузка XML через `axios.get` с `https.Agent({ rejectUnauthorized: false })` (отключение проверки сертификата — как в текущем коде).
- Проверки: статус ответа `OK`, `content-type` содержит `xml`, тело не пустое.
- **Обработка ошибки сети/недоступности**: при неудаче — подождать несколько секунд (например, 5 сек) и повторить попытку **один раз**. Если вторая попытка также не удалась — считать поставщика необработанным, вывести в его статусе ошибку "Выгрузка по URL недоступна".
- Парсинг XML через `fast-xml-parser`, путь к товарам: `yml_catalog.shop.offers.offer`.
- Mapping-лист: `TD`. Строки фильтруются по колонке 3 ≠ 0 и наличию колонки 1 (артикул поставщика).
- Для каждой строки mapping ищем товар в XML, где `param[name="Артикул"] == артикул_поставщика`, берём `param[name="Количество"]`.
- Порог/остаток по умолчанию: порог 600, остаток 5.

### 7.3. АртДизайн (ArtDesign)

- Один файл остатков.
- Mapping-лист: `AD`. Фильтр по колонке 4 ≠ 0.
- Сопоставление: колонка 1 файла остатков (trim) == колонка 2 mapping.
- Результат: [колонка 0 mapping (артикул Ozon), колонка 3 mapping (баркод WB), остаток].
- Порог/остаток по умолчанию: порог 600, остаток 5.

### 7.4. ТДЛ (TDL)

- Один файл остатков (реализовано только для "Бязь 220 однотонная").
- Mapping-лист: `TDL_Byaz_220_solid`. Фильтр по колонке 3 ≠ 0.
- Сопоставление: колонка 3 файла остатков (trim) == колонка 1 mapping.
- Порог/остаток по умолчанию: порог 350, остаток 5.

### 7.5. ЛогатексПРО (Logos)

- Один файл остатков.
- Mapping-лист: `LB`. Фильтр по колонке 3 ≠ 0.
- Сопоставление: колонка 0 файла остатков (trim) == колонка 1 mapping.
- Порог/остаток по умолчанию: порог 350, остаток 10.

### 7.6. Традиции Текстиля (TT)

- Один файл остатков, содержащий одновременно бязь и поплин на одном листе, разделяются по строке-разделителю "Поплин".
- Mapping-лист: `TT`. Фильтр по колонке 3 ≠ 0.
- Определение типа по артикулу поставщика (колонка 0 mapping): если содержит `-BZ-` — искать в блоке "бязь", если `-PP-` — в блоке "поплин", иначе — по всему файлу.
- Сопоставление по колонке 2 данных остатков (trim) == колонка 1 mapping, значение остатка через `stringToInt` (убирает пробелы, приводит к числу).
- Порог/остаток по умолчанию: порог 250, остаток 10.

## 8. Формат итоговых файлов

### Ozon (для каждого поставщика перед объединением):

| Название склада (идентификатор склада) | Артикул | Название товара | Доступно на складе, шт |
|----------------------------------------|---------|-----------------|------------------------|
| `СЦ (Коляново) (1020002072018000)`      | наш артикул | (пусто)         | остаток                |

### WB (для каждого поставщика перед объединением, только строки где есть баркод):

| Баркод   | Количество |
|----------|------------|
| баркод   | остаток    |

Итоговые `ozon-stocks.xlsx` и `wb-stocks.xlsx` — объединение всех строк по всем успешно обработанным поставщикам.

## 9. Backend API (примерная схема)

- `GET /api/config` — получить текущий конфиг (пороги, url TexDesign, инфо о mapping-файле).
- `POST /api/config/mapping` — загрузить/заменить mapping-файл (multipart/form-data).
- `POST /api/config/texdesign-url` — сохранить URL TexDesign (`{ url: string }`).
- `POST /api/config/thresholds` — сохранить пороги/остатки (`{ key: string, threshold: number, remain: number }` или пакетно всем списком).
- `POST /api/generate` — принимает multipart с файлами остатков по всем загруженным поставщикам (поля: `galtex_byaz_220_120`, ..., `ad`, `tdl`, `logos`, `tt`; для `td` файл не нужен), запускает обработку, возвращает JSON со статусами по каждому поставщику (`success` / `error` + текст ошибки / `skipped`) и путями/именами сгенерированных файлов.
- `GET /api/download/ozon` — скачать последний сгенерированный `ozon-stocks.xlsx`.
- `GET /api/download/wb` — скачать последний сгенерированный `wb-stocks.xlsx`.

## 10. Обработка ошибок и статусы (UI)

Для каждого поставщика в процессе/после генерации отображать один из статусов:

- **Ожидание** — до нажатия кнопки генерации.
- **Пропущен** — файл не загружен (для TexDesign — если URL не задан).
- **Обработка...** — во время генерации.
- **Успешно** — с количеством обработанных позиций (опционально, доп. информация).
- **Ошибка** — с текстом ошибки (например: "Sheet not found", "Выгрузка по URL недоступна", "Material name not found" и т.п. — тексты ошибок берутся из существующей логики парсера).

Ошибка в одном поставщике не должна прерывать обработку остальных и не должна мешать формированию итоговых файлов из успешно обработанных поставщиков.

## 11. Внешний вид

Дизайн веб-интерфейса и компонентов в стиле "Claymorphism"

## 11. Прочие технические требования

- Весь backend-код на TypeScript, строгая типизация моделей поставщиков/результатов.
- Frontend на React + TypeScript, адекватная декомпозиция на компоненты (карточка поставщика, блок mapping, блок порогов, блок генерации).
- Взаимодействие с backend через REST API (fetch/axios).
- Обработка загрузки файлов на фронте: `<input type="file">`, хранение File-объектов в состоянии компонента до момента нажатия "Сгенерировать" (когда все файлы отправляются одним запросом на `/api/generate`).
- Персистентность на фронте не требуется (localStorage не нужен) — все постоянные данные (пороги, mapping, url) хранятся на backend и подтягиваются при загрузке страницы через `GET /api/config`.
