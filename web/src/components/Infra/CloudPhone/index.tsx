import { CustomIcon } from '@/components/Agent/Chatbot/Sender/components';
import { message, Spin } from 'antd';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { isFunction, set } from 'lodash-es';
import phoneBgTopUrl from '@/assets/svg/phone-bg-top.svg';
import phoneBgBottomUrl from '@/assets/svg/phone-bg-bottom.svg';
import phoneHighlightUrl from '@/assets/png/phone-highlight.png';

// 动态加载 NzCp SDK
const loadNzCpSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查 NzCp 是否已经存在
    if (typeof window !== 'undefined' && (window as any).NzCp) {
      resolve();
      return;
    }

    // 检查脚本是否已经加载
    const existingScript = document.querySelector('script[src*="NZsdk.min.2.8.1.js"]');
    if (existingScript) {
      // 如果脚本已存在，等待加载完成
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }

    // 动态创建脚本标签
    const script = document.createElement('script');
    script.src = '/NZsdk.min.2.8.1.js';
    script.async = true;

    script.onload = () => {
      // 检查 NzCp 是否成功加载
      if (typeof window !== 'undefined' && (window as any).NzCp) {
        resolve();
      } else {
        reject(new Error('NzCp SDK 加载失败'));
      }
    };

    script.onerror = () => {
      reject(new Error('NzCp SDK 脚本加载失败'));
    };

    document.head.appendChild(script);
  });
};

interface CloudPhoneProps {
  disabled?: boolean;
  needHumanIntervention?: boolean;
  phoneRender?: () => React.ReactNode;
  onUnbindPhone?: () => void;
  accessKey?: string;
  accessSecretKey?: string;
  instanceNo?: string;
  userId?: string;
}

const CloudPhone: React.FC<CloudPhoneProps> = ({
  disabled,
  needHumanIntervention = false,
  phoneRender,
  onUnbindPhone,
  accessKey,
  accessSecretKey,
  instanceNo,
  userId,
}) => {
  const sdkIns = useRef<any>(null);
  const [phoneErrorCode, setPhoneErrorCode] = useState<number>(0);
  const [needHighlight, setNeedHighlight] = useState<boolean>(needHumanIntervention);

  const handlePhoneStart = useCallback(async () => {
    try {
      // 动态加载 NzCp SDK
      try {
        await loadNzCpSDK();
      } catch (error) {
        console.error('NzCp SDK fail to load:', error);
        message.error('SDK fail to load');
        return;
      }

      // 检查 NzCp 是否存在
      if (typeof window === 'undefined' || !(window as any).NzCp) {
        console.error('NzCp not found');
        message.error('SDK not found');
        return;
      }

      sdkIns.current = new (window as any).NzCp();
      const param = {
        userId,
        instanceNo,
        mountId: 'playBox',
        isShowPausedDialog: false,
      };
      const callbacks = {
        onInitFail: (code) => {
          console.info('云手机初始化失败:' + code);
        },
        onStartFail: (code) => {
          console.info('云手机链接失败:' + code);
        },
        // onStartSuccess: () => {
        //   // 链接成功
        //   setLoading(false);
        // },
        onError: (code) => {
          setPhoneErrorCode(code);
          console.info('云手机报错了:' + code);
        },
      };
      const initRet = sdkIns.current.init(param, callbacks);
      if (!initRet) {
        console.info('云手机初始化失败');
        return;
      }
      sdkIns.current.start(accessKey, accessSecretKey);
    } catch (error) {
      console.info(error);
    }
  }, [accessKey, accessSecretKey, instanceNo, userId]);

  const handlePhoneStop = () => {
    if (sdkIns.current) {
      sdkIns.current?.destroy?.();
      sdkIns.current = null;
    }
  };

  const handlePhoneBack = () => {
    if (sdkIns.current) {
      sdkIns.current?.back();
    }
  };

  const handlePhoneHome = () => {
    if (sdkIns.current) {
      sdkIns.current?.home();
    }
  };

  const handlePhoneMenu = () => {
    if (sdkIns.current) {
      sdkIns.current?.menu();
    }
  };

  useEffect(() => {
    if (!phoneRender) {
      handlePhoneStart();
    }

    return () => {
      handlePhoneStop();
    };
  }, [handlePhoneStart, phoneRender]);

  useEffect(() => {
    if (needHumanIntervention) {
      setNeedHighlight(true);
    }
  }, [needHumanIntervention]);

  return (
    <div
      className={`relative w-[316px] max-2xl:w-[239px] pt-[14px] max-2xl:pt-[12px] px-[12px] max-2xl:px-[10px] overflow-hidden transition-all duration-300 ease-out rounded-[50px] max-2xl:rounded-[38px] shadow-[0px_4px_6px_rgba(0,_0,_0,_0.12),_0px_4px_12px_rgba(0,_0,_0,_0.12)] ${
        needHumanIntervention ? 'pb-[62px] max-2xl:pb-[52px]' : 'pb-[14px] max-2xl:pb-[12px]'
      }`}
    >
      {disabled && <div className="absolute top-0 left-0 z-10 w-full h-full"></div>}
      {/* 高亮 */}
      {needHighlight && (
        <div
          className={`absolute top-0 left-0 z-2 w-full h-[548px] max-2xl:h-[414px] bg-top bg-no-repeat bg-[length:100%_100%] animate-fade-in-out`}
          style={{ backgroundImage: `url(${phoneHighlightUrl})` }}
          onMouseEnter={() => setNeedHighlight(false)}
        ></div>
      )}
      {/* 顶部背景 */}
      <div
        className="absolute top-0 left-0 z-0 w-full h-full bg-top bg-no-repeat bg-[length:100%_auto]"
        style={{ backgroundImage: `url(${phoneBgTopUrl})` }}
      ></div>
      {/* 底部背景 */}
      <div
        className="absolute bottom-0 left-0 z-0 flex items-end w-full h-full pb-[20px] max-2xl:pb-[18px] bg-bottom bg-no-repeat bg-[length:100%_auto]"
        style={{ backgroundImage: `url(${phoneBgBottomUrl})` }}
      >
        <div className="flex justify-around w-full">
          <div
            className={`text-[28px] active:text-white max-2xl:text-[20px] ${
              disabled ? 'text-white/[0.3] cursor-default' : 'text-white/[0.8] cursor-pointer'
            }`}
            onClick={handlePhoneBack}
          >
            <CustomIcon type="phoneBack" />
          </div>
          <div
            className={`text-[28px] active:text-white max-2xl:text-[20px] ${
              disabled ? 'text-white/[0.3] cursor-default' : 'text-white/[0.8] cursor-pointer'
            }`}
            onClick={handlePhoneHome}
          >
            <CustomIcon type="phoneHome" />
          </div>
          <div
            className={`text-[28px] active:text-white max-2xl:text-[20px] ${
              disabled ? 'text-white/[0.3] cursor-default' : 'text-white/[0.8] cursor-pointer'
            }`}
            onClick={handlePhoneMenu}
          >
            <CustomIcon type="phoneMenu" />
          </div>
        </div>
      </div>
      {/* 云手机 */}
      <div className="relative flex justify-center items-center w-[292px] max-2xl:w-[219px] h-[520px] max-2xl:h-[390px] overflow-hidden rounded-[36px] max-2xl:rounded-[28px] bg-[#fff]">
        {isFunction(phoneRender) ? (
          phoneRender()
        ) : (
          <>
            <Spin />
            {phoneErrorCode !== 0 && (
              <div className="absolute top-1/2 pt-[24px] text-[#999999]">Error Code {phoneErrorCode}</div>
            )}
            <div
              id="playBox"
              className="absolute left-[-214px] max-2xl:left-[-251px] top-0 w-[720px] h-[520px] max-2xl:h-[390px] overflow-hidden "
            ></div>
          </>
        )}
      </div>
    </div>
  );
};

export default CloudPhone;
