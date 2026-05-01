import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRoute from './AppRoute';



const App = () => {
  return (
    <>
      <RouterProvider router={AppRoute} />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable theme="colored" />

    </>
  )
}

export default App
