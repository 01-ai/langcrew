import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, useRoutes } from 'react-router-dom';

const AppRouter = () => {
  const withSuspense = (LazyComponent) => {
    return (
      <Suspense>
        <LazyComponent />
      </Suspense>
    );
  };

  const Home = withSuspense(lazy(() => import('../pages/home')));
  const Chat = withSuspense(lazy(() => import('../pages/chat')));

  const routes = [
    {
      path: '/',
      element: Home,
    },
    {
      path: '/chat',
      element: <Navigate to="/chat/01" />,
    },
    {
      path: '/chat/:agentId',
      element: Chat,
    },
    {
      path: '/chat/:agentId/:sessionId',
      element: Chat,
    },
    {
      path: '/chat/share/:shareId',
      element: Chat,
    },
    {
      path: '404',
      element: Fallback,
      errorElement: Fallback,
    },
    {
      path: '*',
      element: <Navigate to="/404" />,
    },
  ];

  const Routes = () => {
    return useRoutes(routes);
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes />
    </BrowserRouter>
  );
};

export default AppRouter;
