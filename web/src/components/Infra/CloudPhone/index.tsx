import { CustomIcon } from '@/components/Agent/Chatbot/Sender/components';
import { message, Spin } from 'antd';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { isFunction, set } from 'lodash-es';
import phoneBgTopUrl from '@/assets/svg/phone-bg-top.svg';
import phoneBgBottomUrl from '@/assets/svg/phone-bg-bottom.svg';
import phoneHighlightUrl from '@/assets/png/phone-highlight.png';
import { CloudPhoneAuthInfo } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

// Dynamic Load NzCp SDK
const loadNzCpSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Inspection NzCp Existence
    if (typeof window !== 'undefined' && (window as any).NzCp) {
      resolve();
      return;
    }

    // Check if scripts are loaded
    const existingScript = document.querySelector('script[src*="NZsdk.min.2.8.1.js"]');
    if (existingScript) {
      // If script exists, wait to load it
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }

    // Dynamically create script labels
    const script = document.createElement('script');
    script.src = '/NZsdk.min.2.8.1.js';
    script.async = true;

    script.onload = () => {
      // Inspection NzCp Whether to load successfully
      if (typeof window !== 'undefined' && (window as any).NzCp) {
        resolve();
      } else {
        reject(new Error('NzCp SDK Loading failed'));
      }
    };

    script.onerror = () => {
      reject(new Error('NzCp SDK Script Load Failed'));
    };

    document.head.appendChild(script);
  });
};

interface CloudPhoneProps {
  disabled?: boolean;
  needHumanIntervention?: boolean;
  phoneRender?: () => React.ReactNode;
  onUnbindPhone?: () => void;
  authInfo?: CloudPhoneAuthInfo;
}

const CloudPhone: React.FC<CloudPhoneProps> = ({
  disabled,
  needHumanIntervention = false,
  phoneRender,
  onUnbindPhone,
  authInfo,
}) => {
  const { t } = useTranslation();
  const sdkIns = useRef<any>(null);
  const isStarting = useRef<boolean>(false);
  const [phoneErrorCode, setPhoneErrorCode] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [needHighlight, setNeedHighlight] = useState<boolean>(needHumanIntervention);
  const {
    user_id: userId,
    instance_no: instanceNo,
    access_key: accessKey,
    access_secret_key: accessSecretKey,
  } = authInfo || {};

  const handlePhoneStart = useCallback(async () => {
    if (isStarting.current || !userId || !instanceNo) return;
    isStarting.current = true;
    setLoading(true);

    try {
      // Dynamic Load NzCp SDK
      try {
        await loadNzCpSDK();
      } catch (error) {
        console.error('[CloudPhone] NzCp SDK fail to load:', error);
        message.error(t('cloudphone.sdk.load_failed'));
        isStarting.current = false;
        return;
      }

      // Inspection NzCp Existence
      if (typeof window === 'undefined' || !(window as any).NzCp) {
        console.error('[CloudPhone] NzCp not found');
        message.error(t('cloudphone.sdk.not_found'));
        isStarting.current = false;
        return;
      }

      console.info('Starting CloudPhone with:', { userId, instanceNo });
      sdkIns.current = new (window as any).NzCp();
      const param = {
        userId,
        instanceNo,
        mountId: 'playBox',
        isShowPausedDialog: false,
      };
      const callbacks = {
        onInitFail: (code: any) => {
          console.error('[CloudPhone] The initialization of the cloud phone failed.:', code);
          setPhoneErrorCode(code);
          setLoading(false);
          isStarting.current = false;
        },
        onStartFail: (code: any) => {
          console.error('[CloudPhone] Cloud phone link failed:', code);
          setPhoneErrorCode(code);
          setLoading(false);
          isStarting.current = false;
        },
        onStartSuccess: () => {
          console.info('[CloudPhone] Cloud cell link successful.');
          setLoading(false);
          isStarting.current = false;
        },
        onError: (code: any) => {
          setPhoneErrorCode(code);
          console.error('[CloudPhone] The cloud phone is wrong.:', code);
          setLoading(false);
          isStarting.current = false;
        },
      };
      const initRet = sdkIns.current.init(param, callbacks);
      if (!initRet) {
        console.error('[CloudPhone] Cloud cell phone. init Back false');
        setLoading(false);
        isStarting.current = false;
        return;
      }
      sdkIns.current.start(accessKey, accessSecretKey);
    } catch (error) {
      console.info(error);
      setLoading(false);
      isStarting.current = false;
    }
  }, [accessKey, accessSecretKey, instanceNo, t, userId]);

  const handlePhoneStop = () => {
    if (sdkIns.current) {
      console.info('[CloudPhone] Destroying SDK instance');
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
  }, [userId, instanceNo, phoneRender]);

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
      {/* Highlight. */}
      {needHighlight && (
        <div
          className={`absolute top-0 left-0 z-2 w-full h-[548px] max-2xl:h-[414px] bg-top bg-no-repeat bg-[length:100%_100%] animate-fade-in-out`}
          style={{ backgroundImage: `url(${phoneHighlightUrl})` }}
          onMouseEnter={() => setNeedHighlight(false)}
        ></div>
      )}
      {/* Top background. */}
      <div
        className="absolute top-0 left-0 z-0 w-full h-full bg-top bg-no-repeat bg-[length:100%_auto]"
        style={{ backgroundImage: `url(${phoneBgTopUrl})` }}
      ></div>
      {/* Bottom background. */}
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
      {/* Cloud phone. */}
      <div className="relative flex justify-center items-center w-[292px] max-2xl:w-[219px] h-[520px] max-2xl:h-[390px] overflow-hidden rounded-[36px] max-2xl:rounded-[28px] bg-[#000]">
        {isFunction(phoneRender) ? (
          phoneRender()
        ) : (
          <>
            {loading && <Spin />}
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
