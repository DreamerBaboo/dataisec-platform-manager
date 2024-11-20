import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);

// // 根據環境動態啟用或禁用 StrictMode
// if (import.meta.env.NODE_ENV === 'development') {
//   root.render(
//     <React.StrictMode>
//       <App />
//     </React.StrictMode>
//   );
// } else {
//   root.render(<App />);
// }

// /*
//   StrictMode 選項說明:
//   1. 開發環境下會執行兩次渲染以檢測副作用
//   2. 檢查過時的生命週期方法
//   3. 檢查遺留的 context API 用法
//   4. 檢查意外的副作用
//   5. 檢查 findDOMNode 的使用
//   6. 檢查過時的 ref 字符串用法

//   使用 StrictMode (推薦用於開發環境)
//     root.render(
//       <React.StrictMode>
//         <App />
//       </React.StrictMode>
//     );

//   不使用 StrictMode (生產環境可選)
//     root.render(<App />);
// */
